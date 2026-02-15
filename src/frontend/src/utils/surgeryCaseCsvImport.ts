import type { SurgeryCase, Species, Sex, ToDoItem } from '../backend';
import { Species as SpeciesEnum, Sex as SexEnum } from '../backend';

/**
 * CSV Import Schema Documentation:
 * 
 * Required columns (case-insensitive):
 * - id: Numeric case ID
 * - mrn: Medical Record Number (text)
 * - patientFirstName: Patient's first name
 * - patientLastName: Patient's last name
 * - dateOfBirth: Date of birth (YYYY-MM-DD format)
 * - arrivalDate: Arrival date/time (YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, or ISO 8601 format)
 * - species: canine, feline, or other (case-insensitive)
 * - breed: Breed name (text)
 * - sex: male, female, male neutered (or MN), female spayed (or FS), or unknown (case-insensitive)
 * - presentingComplaint: Presenting complaint (text)
 * 
 * Optional boolean columns (case-insensitive, accepts: true/false, yes/no, 1/0, checked/unchecked):
 * - dischargeNotesComplete
 * - pdvmNotified
 * - labsComplete
 * - histoComplete
 * - surgeryReportComplete
 * - imagingComplete
 * - cultureComplete
 * 
 * Optional text columns:
 * - notes: Case notes (plain text)
 * 
 * Optional todos column:
 * - todos: Semicolon-separated list of to-do items in format "id:description:complete"
 *   Example: "1:Review labs:true;2:Call owner:false"
 *   If omitted or empty, case will have no to-do items
 */

interface CsvParseError {
  row: number;
  column?: string;
  message: string;
}

/**
 * Parse a CSV line respecting quoted fields
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

/**
 * Normalize header name for case-insensitive matching
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[_\s]/g, '');
}

/**
 * Parse boolean value from various formats
 */
function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || 
         normalized === 'yes' || 
         normalized === '1' || 
         normalized === 'checked';
}

/**
 * Parse species enum value
 */
function parseSpecies(value: string): Species {
  const normalized = value.toLowerCase().trim();
  if (normalized === 'canine') return SpeciesEnum.canine;
  if (normalized === 'feline') return SpeciesEnum.feline;
  if (normalized === 'other') return SpeciesEnum.other;
  throw new Error(`Invalid species value: "${value}". Must be canine, feline, or other.`);
}

/**
 * Parse sex enum value
 */
function parseSex(value: string): Sex {
  const normalized = value.toLowerCase().trim().replace(/[\s_-]/g, '');
  
  // Male variants
  if (normalized === 'male' || normalized === 'm') {
    return SexEnum.male;
  }
  
  // Female variants
  if (normalized === 'female' || normalized === 'f') {
    return SexEnum.female;
  }
  
  // Male Neutered variants
  if (
    normalized === 'maleneutered' ||
    normalized === 'mn' ||
    normalized === 'neuteredmale' ||
    normalized === 'neutered'
  ) {
    return SexEnum.maleNeutered;
  }
  
  // Female Spayed variants
  if (
    normalized === 'femalespayed' ||
    normalized === 'fs' ||
    normalized === 'spayedfemale' ||
    normalized === 'spayed'
  ) {
    return SexEnum.femaleSpayed;
  }
  
  // Unknown variants
  if (normalized === 'unknown' || normalized === 'u') {
    return SexEnum.unknown_;
  }
  
  throw new Error(
    `Invalid sex value: "${value}". Must be one of: Male, Female, Male Neutered (MN), Female Spayed (FS), or Unknown.`
  );
}

/**
 * Parse arrival date to backend Time (bigint nanoseconds)
 * Accepts: YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, or ISO 8601
 */
function parseArrivalDate(value: string): bigint {
  const trimmed = value.trim();
  
  // Try parsing as ISO 8601 first
  let date = new Date(trimmed);
  
  // If invalid, try YYYY-MM-DD format
  if (isNaN(date.getTime())) {
    // Add time component if missing
    const dateWithTime = trimmed.includes(' ') ? trimmed : `${trimmed} 00:00:00`;
    date = new Date(dateWithTime);
  }
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: "${value}". Use YYYY-MM-DD, YYYY-MM-DD HH:MM:SS, or ISO 8601.`);
  }
  
  const milliseconds = date.getTime();
  return BigInt(milliseconds) * BigInt(1_000_000);
}

/**
 * Parse todos from semicolon-separated format
 * Format: "id:description:complete;id:description:complete"
 */
function parseTodos(value: string): ToDoItem[] {
  if (!value || !value.trim()) {
    return [];
  }
  
  const todos: ToDoItem[] = [];
  const items = value.split(';');
  
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    
    const parts = trimmed.split(':');
    if (parts.length !== 3) {
      throw new Error(`Invalid todo format: "${item}". Expected format: "id:description:complete"`);
    }
    
    const id = parseInt(parts[0].trim(), 10);
    if (isNaN(id)) {
      throw new Error(`Invalid todo ID: "${parts[0]}". Must be a number.`);
    }
    
    todos.push({
      id: BigInt(id),
      description: parts[1].trim(),
      complete: parseBoolean(parts[2]),
    });
  }
  
  return todos;
}

/**
 * Parse CSV text into SurgeryCase array
 */
export function parseCsvToSurgeryCases(csvText: string): SurgeryCase[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  if (lines.length === 1) {
    throw new Error('CSV file contains only headers, no data rows');
  }
  
  // Parse header
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine);
  const normalizedHeaders = headers.map(normalizeHeader);
  
  // Required columns
  const requiredColumns = [
    'id', 'mrn', 'patientfirstname', 'patientlastname', 'dateofbirth',
    'arrivaldate', 'species', 'breed', 'sex', 'presentingcomplaint'
  ];
  
  // Check for required columns
  const missingColumns = requiredColumns.filter(
    col => !normalizedHeaders.includes(col)
  );
  
  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(', ')}. ` +
      `Required columns are: ${requiredColumns.join(', ')}`
    );
  }
  
  // Create column index map
  const columnMap = new Map<string, number>();
  normalizedHeaders.forEach((header, index) => {
    columnMap.set(header, index);
  });
  
  // Helper to get column value
  const getColumn = (row: string[], columnName: string): string => {
    const index = columnMap.get(normalizeHeader(columnName));
    if (index === undefined) return '';
    return row[index] || '';
  };
  
  // Parse data rows
  const cases: SurgeryCase[] = [];
  const errors: CsvParseError[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const line = lines[i].trim();
    
    if (!line) continue; // Skip empty lines
    
    try {
      const row = parseCsvLine(line);
      
      // Validate row has enough columns
      if (row.length < headers.length) {
        errors.push({
          row: lineNumber,
          message: `Row has ${row.length} columns but header has ${headers.length} columns`
        });
        continue;
      }
      
      // Parse required fields
      const idStr = getColumn(row, 'id');
      if (!idStr) {
        errors.push({ row: lineNumber, column: 'id', message: 'ID is required' });
        continue;
      }
      
      const id = parseInt(idStr, 10);
      if (isNaN(id)) {
        errors.push({ row: lineNumber, column: 'id', message: `Invalid ID: "${idStr}"` });
        continue;
      }
      
      const mrn = getColumn(row, 'mrn');
      if (!mrn) {
        errors.push({ row: lineNumber, column: 'mrn', message: 'MRN is required' });
        continue;
      }
      
      const patientFirstName = getColumn(row, 'patientFirstName');
      if (!patientFirstName) {
        errors.push({ row: lineNumber, column: 'patientFirstName', message: 'Patient first name is required' });
        continue;
      }
      
      const patientLastName = getColumn(row, 'patientLastName');
      if (!patientLastName) {
        errors.push({ row: lineNumber, column: 'patientLastName', message: 'Patient last name is required' });
        continue;
      }
      
      const dateOfBirth = getColumn(row, 'dateOfBirth');
      if (!dateOfBirth) {
        errors.push({ row: lineNumber, column: 'dateOfBirth', message: 'Date of birth is required' });
        continue;
      }
      
      const arrivalDateStr = getColumn(row, 'arrivalDate');
      if (!arrivalDateStr) {
        errors.push({ row: lineNumber, column: 'arrivalDate', message: 'Arrival date is required' });
        continue;
      }
      
      let arrivalDate: bigint;
      try {
        arrivalDate = parseArrivalDate(arrivalDateStr);
      } catch (error: any) {
        errors.push({ row: lineNumber, column: 'arrivalDate', message: error.message });
        continue;
      }
      
      const speciesStr = getColumn(row, 'species');
      if (!speciesStr) {
        errors.push({ row: lineNumber, column: 'species', message: 'Species is required' });
        continue;
      }
      
      let species: Species;
      try {
        species = parseSpecies(speciesStr);
      } catch (error: any) {
        errors.push({ row: lineNumber, column: 'species', message: error.message });
        continue;
      }
      
      const breed = getColumn(row, 'breed');
      if (!breed) {
        errors.push({ row: lineNumber, column: 'breed', message: 'Breed is required' });
        continue;
      }
      
      const sexStr = getColumn(row, 'sex');
      if (!sexStr) {
        errors.push({ row: lineNumber, column: 'sex', message: 'Sex is required' });
        continue;
      }
      
      let sex: Sex;
      try {
        sex = parseSex(sexStr);
      } catch (error: any) {
        errors.push({ row: lineNumber, column: 'sex', message: error.message });
        continue;
      }
      
      const presentingComplaint = getColumn(row, 'presentingComplaint');
      if (!presentingComplaint) {
        errors.push({ row: lineNumber, column: 'presentingComplaint', message: 'Presenting complaint is required' });
        continue;
      }
      
      // Parse optional boolean fields
      const dischargeNotesComplete = parseBoolean(getColumn(row, 'dischargeNotesComplete') || 'false');
      const pdvmNotified = parseBoolean(getColumn(row, 'pdvmNotified') || 'false');
      const labsComplete = parseBoolean(getColumn(row, 'labsComplete') || 'false');
      const histoComplete = parseBoolean(getColumn(row, 'histoComplete') || 'false');
      const surgeryReportComplete = parseBoolean(getColumn(row, 'surgeryReportComplete') || 'false');
      const imagingComplete = parseBoolean(getColumn(row, 'imagingComplete') || 'false');
      const cultureComplete = parseBoolean(getColumn(row, 'cultureComplete') || 'false');
      
      // Parse optional notes field
      const notes = getColumn(row, 'notes') || '';
      
      // Parse todos
      let todos: ToDoItem[] = [];
      const todosStr = getColumn(row, 'todos');
      if (todosStr) {
        try {
          todos = parseTodos(todosStr);
        } catch (error: any) {
          errors.push({ row: lineNumber, column: 'todos', message: error.message });
          continue;
        }
      }
      
      // Create case object
      cases.push({
        id: BigInt(id),
        mrn,
        patientFirstName,
        patientLastName,
        dateOfBirth,
        arrivalDate,
        species,
        breed,
        sex,
        presentingComplaint,
        dischargeNotesComplete,
        pdvmNotified,
        labsComplete,
        histoComplete,
        surgeryReportComplete,
        imagingComplete,
        cultureComplete,
        notes,
        todos,
      });
      
    } catch (error: any) {
      errors.push({
        row: lineNumber,
        message: error.message || 'Unknown error parsing row'
      });
    }
  }
  
  // If there are errors, throw with details
  if (errors.length > 0) {
    const errorMessages = errors.slice(0, 5).map(err => {
      if (err.column) {
        return `Row ${err.row}, column "${err.column}": ${err.message}`;
      }
      return `Row ${err.row}: ${err.message}`;
    });
    
    const moreErrors = errors.length > 5 ? ` (and ${errors.length - 5} more errors)` : '';
    throw new Error(
      `CSV validation failed with ${errors.length} error(s):\n` +
      errorMessages.join('\n') +
      moreErrors
    );
  }
  
  if (cases.length === 0) {
    throw new Error('No valid cases found in CSV file');
  }
  
  return cases;
}
