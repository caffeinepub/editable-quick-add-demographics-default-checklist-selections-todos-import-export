import { useForm } from 'react-hook-form';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { getTodayDateString, dateStringToTime, timeToDateString } from '../../utils/dateTime';
import QuickAddDemographics from './QuickAddDemographics';
import { findMostRecentCaseByMRN } from '../../utils/caseMatching';
import { toast } from 'sonner';
import type { SurgeryCase, Species, Sex } from '../../backend';
import type { ParsedDemographics } from '../../utils/demographicsParser';

export interface CaseFormData {
  mrn: string;
  patientFirstName: string;
  patientLastName: string;
  dateOfBirth: string;
  arrivalDate: bigint;
  species: Species;
  breed: string;
  sex: Sex;
  presentingComplaint: string;
  dischargeNotesComplete: boolean;
  pdvmNotified: boolean;
  labsComplete: boolean;
  histoComplete: boolean;
  surgeryReportComplete: boolean;
  imagingComplete: boolean;
  cultureComplete: boolean;
  notes: string;
}

interface CaseFormProps {
  initialData?: SurgeryCase;
  onSubmit: (data: CaseFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  existingCases?: SurgeryCase[];
}

export default function CaseForm({ initialData, onSubmit, onCancel, isSubmitting, existingCases = [] }: CaseFormProps) {
  const defaultArrivalDate = initialData ? timeToDateString(initialData.arrivalDate) : getTodayDateString();
  const isNewCase = !initialData;
  const lastCheckedMRN = useRef<string>('');
  
  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<{
    mrn: string;
    patientFirstName: string;
    patientLastName: string;
    dateOfBirth: string;
    arrivalDate: string;
    species: Species;
    breed: string;
    sex: Sex;
    presentingComplaint: string;
    dischargeNotesComplete: boolean;
    pdvmNotified: boolean;
    labsComplete: boolean;
    histoComplete: boolean;
    surgeryReportComplete: boolean;
    imagingComplete: boolean;
    cultureComplete: boolean;
    notes: string;
  }>({
    defaultValues: {
      mrn: initialData?.mrn || '',
      patientFirstName: initialData?.patientFirstName || '',
      patientLastName: initialData?.patientLastName || '',
      dateOfBirth: initialData?.dateOfBirth || '',
      arrivalDate: defaultArrivalDate,
      species: (initialData?.species || 'canine') as Species,
      breed: initialData?.breed || '',
      sex: (initialData?.sex || 'unknown_') as Sex,
      presentingComplaint: initialData?.presentingComplaint || '',
      dischargeNotesComplete: initialData?.dischargeNotesComplete ?? (isNewCase ? true : false),
      pdvmNotified: initialData?.pdvmNotified ?? (isNewCase ? true : false),
      labsComplete: initialData?.labsComplete || false,
      histoComplete: initialData?.histoComplete || false,
      surgeryReportComplete: initialData?.surgeryReportComplete || false,
      imagingComplete: initialData?.imagingComplete || false,
      cultureComplete: initialData?.cultureComplete || false,
      notes: initialData?.notes || '',
    },
  });

  const mrn = watch('mrn');
  const species = watch('species');
  const sex = watch('sex');
  const dischargeNotesComplete = watch('dischargeNotesComplete');
  const pdvmNotified = watch('pdvmNotified');
  const labsComplete = watch('labsComplete');
  const histoComplete = watch('histoComplete');
  const surgeryReportComplete = watch('surgeryReportComplete');
  const imagingComplete = watch('imagingComplete');
  const cultureComplete = watch('cultureComplete');

  // Duplicate MRN detection and auto-fill (only for new cases)
  useEffect(() => {
    if (!isNewCase || !mrn || mrn.trim() === '') {
      return;
    }

    const trimmedMRN = mrn.trim();
    
    // Only check if MRN has changed
    if (trimmedMRN === lastCheckedMRN.current) {
      return;
    }

    lastCheckedMRN.current = trimmedMRN;

    const matchingCase = findMostRecentCaseByMRN(trimmedMRN, existingCases);

    if (matchingCase) {
      // Show alert
      toast.info('Duplicate MRN detected', {
        description: `Auto-filling demographics from existing case for ${matchingCase.patientFirstName} ${matchingCase.patientLastName}`,
      });

      // Auto-fill demographics
      setValue('mrn', matchingCase.mrn);
      setValue('dateOfBirth', matchingCase.dateOfBirth);
      setValue('patientFirstName', matchingCase.patientFirstName);
      setValue('patientLastName', matchingCase.patientLastName);
      setValue('species', matchingCase.species);
      setValue('breed', matchingCase.breed);
      setValue('sex', matchingCase.sex);
    }
  }, [mrn, isNewCase, existingCases, setValue]);

  const handleQuickAddApply = (demographics: ParsedDemographics) => {
    // Apply parsed demographics to form fields
    if (demographics.mrn) setValue('mrn', demographics.mrn);
    if (demographics.patientFirstName) setValue('patientFirstName', demographics.patientFirstName);
    if (demographics.patientLastName) setValue('patientLastName', demographics.patientLastName);
    if (demographics.dateOfBirth) setValue('dateOfBirth', demographics.dateOfBirth);
    if (demographics.species) setValue('species', demographics.species);
    if (demographics.breed) setValue('breed', demographics.breed);
    if (demographics.sex) setValue('sex', demographics.sex);
    if (demographics.arrivalDate) setValue('arrivalDate', demographics.arrivalDate);
  };

  const onFormSubmit = (data: any) => {
    const formData: CaseFormData = {
      ...data,
      arrivalDate: dateStringToTime(data.arrivalDate),
    };
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
      {/* Patient Demographics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Patient Demographics</h3>

        {/* Quick Add Section - only show on new case */}
        {isNewCase && (
          <QuickAddDemographics
            onApply={handleQuickAddApply}
            currentValues={{
              mrn: getValues('mrn'),
              patientFirstName: getValues('patientFirstName'),
              patientLastName: getValues('patientLastName'),
              dateOfBirth: getValues('dateOfBirth'),
              species: getValues('species'),
              breed: getValues('breed'),
              sex: getValues('sex'),
              arrivalDate: getValues('arrivalDate'),
            }}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="mrn">Medical Record Number (MRN) *</Label>
            <Input
              id="mrn"
              {...register('mrn', { required: 'MRN is required' })}
              placeholder="e.g., 12345"
            />
            {errors.mrn && (
              <p className="text-sm text-destructive">{errors.mrn.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register('dateOfBirth')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientFirstName">Patient First Name *</Label>
            <Input
              id="patientFirstName"
              {...register('patientFirstName', { required: 'First name is required' })}
              placeholder="e.g., Max"
            />
            {errors.patientFirstName && (
              <p className="text-sm text-destructive">{errors.patientFirstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="patientLastName">Patient Last Name *</Label>
            <Input
              id="patientLastName"
              {...register('patientLastName', { required: 'Last name is required' })}
              placeholder="e.g., Smith"
            />
            {errors.patientLastName && (
              <p className="text-sm text-destructive">{errors.patientLastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="species">Species *</Label>
            <Select value={species} onValueChange={(value) => setValue('species', value as Species)}>
              <SelectTrigger id="species">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="canine">Canine</SelectItem>
                <SelectItem value="feline">Feline</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breed">Breed</Label>
            <Input
              id="breed"
              {...register('breed')}
              placeholder="e.g., Labrador Retriever"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sex">Sex</Label>
            <Select value={sex} onValueChange={(value) => setValue('sex', value as Sex)}>
              <SelectTrigger id="sex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="unknown_">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="arrivalDate">Arrival Date *</Label>
            <Input
              id="arrivalDate"
              type="date"
              {...register('arrivalDate', { required: 'Arrival date is required' })}
            />
            {errors.arrivalDate && (
              <p className="text-sm text-destructive">{errors.arrivalDate.message}</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Case Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Case Information</h3>

        <div className="space-y-2">
          <Label htmlFor="presentingComplaint">Presenting Complaint *</Label>
          <Textarea
            id="presentingComplaint"
            {...register('presentingComplaint', { required: 'Presenting complaint is required' })}
            placeholder="Describe the reason for the visit..."
            rows={4}
          />
          {errors.presentingComplaint && (
            <p className="text-sm text-destructive">{errors.presentingComplaint.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Case Notes</Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Add any additional notes about this case..."
            rows={4}
          />
        </div>
      </div>

      <Separator />

      {/* Checklist */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Case Checklist</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dischargeNotesComplete"
              checked={dischargeNotesComplete}
              onCheckedChange={(checked) => setValue('dischargeNotesComplete', checked as boolean)}
            />
            <Label htmlFor="dischargeNotesComplete" className="cursor-pointer">
              Discharge Notes Complete
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="pdvmNotified"
              checked={pdvmNotified}
              onCheckedChange={(checked) => setValue('pdvmNotified', checked as boolean)}
            />
            <Label htmlFor="pdvmNotified" className="cursor-pointer">
              pDVM Notified
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="labsComplete"
              checked={labsComplete}
              onCheckedChange={(checked) => setValue('labsComplete', checked as boolean)}
            />
            <Label htmlFor="labsComplete" className="cursor-pointer">
              Labs Complete
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="histoComplete"
              checked={histoComplete}
              onCheckedChange={(checked) => setValue('histoComplete', checked as boolean)}
            />
            <Label htmlFor="histoComplete" className="cursor-pointer">
              Histopathology Complete
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="surgeryReportComplete"
              checked={surgeryReportComplete}
              onCheckedChange={(checked) => setValue('surgeryReportComplete', checked as boolean)}
            />
            <Label htmlFor="surgeryReportComplete" className="cursor-pointer">
              Surgery Report Complete
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="imagingComplete"
              checked={imagingComplete}
              onCheckedChange={(checked) => setValue('imagingComplete', checked as boolean)}
            />
            <Label htmlFor="imagingComplete" className="cursor-pointer">
              Imaging Complete
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="cultureComplete"
              checked={cultureComplete}
              onCheckedChange={(checked) => setValue('cultureComplete', checked as boolean)}
            />
            <Label htmlFor="cultureComplete" className="cursor-pointer">
              Culture Complete
            </Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Form Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? 'Update Case' : 'Create Case'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
