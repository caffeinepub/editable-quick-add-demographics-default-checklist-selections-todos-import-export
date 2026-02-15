import type { Species, Sex } from '../backend';

export interface ParsedDemographics {
  mrn?: string;
  patientFirstName?: string;
  patientLastName?: string;
  dateOfBirth?: string; // YYYY-MM-DD format
  species?: Species;
  breed?: string;
  sex?: Sex;
  arrivalDate?: string; // YYYY-MM-DD format
}

export interface ParseResult {
  parsed: ParsedDemographics;
  notFound: string[];
  uncertain: string[];
}

const FIELD_LABELS: Record<keyof ParsedDemographics, string> = {
  mrn: 'Medical Record Number',
  patientFirstName: 'First Name',
  patientLastName: 'Last Name',
  dateOfBirth: 'Date of Birth',
  species: 'Species',
  breed: 'Breed',
  sex: 'Sex',
  arrivalDate: 'Arrival Date',
};

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field as keyof ParsedDemographics] || field;
}

/**
 * Parse free-text demographics into structured case fields
 */
export function parseDemographics(text: string): ParseResult {
  if (!text || text.trim().length === 0) {
    return {
      parsed: {},
      notFound: Object.keys(FIELD_LABELS),
      uncertain: [],
    };
  }

  const parsed: ParsedDemographics = {};
  const notFound: string[] = [];
  const uncertain: string[] = [];

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const fullText = text.toLowerCase();

  // Parse MRN - look for patterns like "MRN: 12345", "MRN-12345", "Medical Record: 12345"
  const mrnMatch = text.match(/(?:mrn|medical\s+record(?:\s+number)?)[:\s-]+([a-z0-9-]+)/i);
  if (mrnMatch) {
    parsed.mrn = mrnMatch[1].trim();
  } else {
    notFound.push('mrn');
  }

  // Parse names - look for "Name:", "Patient:", "First Name:", "Last Name:"
  const firstNameMatch = text.match(/(?:first\s+name|patient\s+first)[:\s]+([a-z]+)/i);
  const lastNameMatch = text.match(/(?:last\s+name|patient\s+last|surname)[:\s]+([a-z]+)/i);
  
  // Alternative: look for "Name: FirstName LastName" pattern
  const fullNameMatch = text.match(/(?:name|patient)[:\s]+([a-z]+)\s+([a-z]+)/i);
  
  if (firstNameMatch) {
    parsed.patientFirstName = firstNameMatch[1].trim();
  } else if (fullNameMatch) {
    parsed.patientFirstName = fullNameMatch[1].trim();
  } else {
    notFound.push('patientFirstName');
  }

  if (lastNameMatch) {
    parsed.patientLastName = lastNameMatch[1].trim();
  } else if (fullNameMatch) {
    parsed.patientLastName = fullNameMatch[2].trim();
  } else {
    notFound.push('patientLastName');
  }

  // Parse dates - look for DOB, Birth Date, Date of Birth
  const dobMatch = text.match(/(?:dob|date\s+of\s+birth|birth\s+date)[:\s]+([0-9/-]+)/i);
  if (dobMatch) {
    const parsedDate = parseDate(dobMatch[1].trim());
    if (parsedDate) {
      parsed.dateOfBirth = parsedDate;
    } else {
      uncertain.push('dateOfBirth');
    }
  } else {
    notFound.push('dateOfBirth');
  }

  // Parse arrival date
  const arrivalMatch = text.match(/(?:arrival\s+date|admitted|admission)[:\s]+([0-9/-]+)/i);
  if (arrivalMatch) {
    const parsedDate = parseDate(arrivalMatch[1].trim());
    if (parsedDate) {
      parsed.arrivalDate = parsedDate;
    }
  }

  // Parse species - normalize to canine/feline/other
  if (fullText.includes('dog') || fullText.includes('canine')) {
    parsed.species = 'canine' as Species;
  } else if (fullText.includes('cat') || fullText.includes('feline')) {
    parsed.species = 'feline' as Species;
  } else {
    const speciesMatch = text.match(/(?:species)[:\s]+(canine|feline|other)/i);
    if (speciesMatch) {
      parsed.species = speciesMatch[1].toLowerCase() as Species;
    } else {
      notFound.push('species');
    }
  }

  // Parse breed
  const breedMatch = text.match(/(?:breed)[:\s]+([a-z\s]+?)(?:\n|$|sex|species|male|female|neutered|spayed)/i);
  if (breedMatch) {
    parsed.breed = breedMatch[1].trim();
  } else {
    notFound.push('breed');
  }

  // Parse sex - normalize to male/female/maleNeutered/femaleSpayed/unknown_
  // Check for neutered/spayed indicators
  const hasNeutered = /neutered|castrated|mn\b/i.test(fullText);
  const hasSpayed = /spayed|fs\b/i.test(fullText);
  const hasMale = /\bmale\b/i.test(fullText) && !/female/i.test(fullText);
  const hasFemale = /female/i.test(fullText);

  if (hasMale && hasNeutered) {
    parsed.sex = 'maleNeutered' as Sex;
  } else if (hasFemale && hasSpayed) {
    parsed.sex = 'femaleSpayed' as Sex;
  } else if (hasMale) {
    parsed.sex = 'male' as Sex;
  } else if (hasFemale) {
    parsed.sex = 'female' as Sex;
  } else {
    // Try explicit sex field match
    const sexMatch = text.match(/(?:sex|gender)[:\s]+(male\s*neutered|female\s*spayed|male|female|unknown|mn|fs|m|f)/i);
    if (sexMatch) {
      const sexValue = sexMatch[1].toLowerCase().replace(/\s+/g, '');
      if (sexValue === 'male' || sexValue === 'm') {
        parsed.sex = 'male' as Sex;
      } else if (sexValue === 'female' || sexValue === 'f') {
        parsed.sex = 'female' as Sex;
      } else if (sexValue === 'maleneutered' || sexValue === 'mn') {
        parsed.sex = 'maleNeutered' as Sex;
      } else if (sexValue === 'femalespayed' || sexValue === 'fs') {
        parsed.sex = 'femaleSpayed' as Sex;
      } else {
        parsed.sex = 'unknown_' as Sex;
      }
    } else {
      notFound.push('sex');
    }
  }

  return { parsed, notFound, uncertain };
}

/**
 * Parse various date formats into YYYY-MM-DD
 */
function parseDate(dateStr: string): string | null {
  // Remove extra whitespace
  dateStr = dateStr.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Try MM/DD/YYYY or M/D/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Try DD-MM-YYYY or D-M-YYYY
  const dashMatch = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const day = dashMatch[1].padStart(2, '0');
    const month = dashMatch[2].padStart(2, '0');
    const year = dashMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}
