import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Camera, FileText, X, AlertCircle, Loader2 } from 'lucide-react';
import { parseDemographics, getFieldLabel, type ParsedDemographics } from '../../utils/demographicsParser';
import { extractTextFromImage, isTextDetectionSupported } from '../../utils/ocrText';
import { useCamera } from '../../camera/useCamera';
import type { Species, Sex } from '../../backend';

interface QuickAddDemographicsProps {
  onApply: (demographics: ParsedDemographics) => void;
  currentValues: ParsedDemographics;
}

export default function QuickAddDemographics({ onApply, currentValues }: QuickAddDemographicsProps) {
  const [pastedText, setPastedText] = useState('');
  const [parseResult, setParseResult] = useState<ReturnType<typeof parseDemographics> | null>(null);
  const [editedValues, setEditedValues] = useState<ParsedDemographics>({});
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [ocrError, setOcrError] = useState<string>('');

  const {
    isActive,
    isSupported,
    error: cameraError,
    isLoading: cameraLoading,
    startCamera,
    stopCamera,
    capturePhoto,
    videoRef,
    canvasRef,
  } = useCamera({
    facingMode: 'environment',
    quality: 0.9,
  });

  const handleParse = () => {
    if (!pastedText.trim()) {
      setParseResult({
        parsed: {},
        notFound: Object.keys(currentValues),
        uncertain: [],
      });
      setEditedValues({});
      return;
    }

    const result = parseDemographics(pastedText);
    setParseResult(result);
    setEditedValues({ ...result.parsed });
  };

  const handleApply = () => {
    if (editedValues && Object.keys(editedValues).length > 0) {
      onApply(editedValues);
      // Clear the quick add state after applying
      setPastedText('');
      setParseResult(null);
      setEditedValues({});
      setCapturedImage(null);
      setOcrStatus('idle');
    }
  };

  const handleClear = () => {
    setPastedText('');
    setParseResult(null);
    setEditedValues({});
    setCapturedImage(null);
    setOcrStatus('idle');
    setOcrError('');
  };

  const handleOpenCamera = async () => {
    setShowCamera(true);
    const success = await startCamera();
    if (!success) {
      setShowCamera(false);
    }
  };

  const handleCloseCamera = async () => {
    await stopCamera();
    setShowCamera(false);
    setCapturedImage(null);
    setOcrStatus('idle');
  };

  const handleCapture = async () => {
    const photoFile = await capturePhoto();
    if (photoFile) {
      // Show preview
      const imageUrl = URL.createObjectURL(photoFile);
      setCapturedImage(imageUrl);

      // Process OCR
      setOcrStatus('processing');
      setOcrError('');

      try {
        const ocrResult = await extractTextFromImage(photoFile);
        
        if (ocrResult.success && ocrResult.text && ocrResult.text.trim()) {
          setPastedText(ocrResult.text);
          setOcrStatus('success');
          
          // Auto-parse the extracted text
          const result = parseDemographics(ocrResult.text);
          setParseResult(result);
          setEditedValues({ ...result.parsed });
        } else {
          setOcrStatus('error');
          setOcrError(ocrResult.error || 'No text detected in the image. Please try again with better lighting or a clearer image.');
        }
      } catch (error: any) {
        setOcrStatus('error');
        setOcrError(error.message || 'Failed to extract text from image');
      }

      // Close camera after capture
      await handleCloseCamera();
    }
  };

  const handleEditField = (field: keyof ParsedDemographics, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Camera view
  if (showCamera) {
    return (
      <Card className="p-4 space-y-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Camera Capture
          </h4>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCloseCamera}
            disabled={cameraLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {cameraError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {cameraError.message}
            </AlertDescription>
          </Alert>
        )}

        {isSupported === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Camera is not supported in this browser.
            </AlertDescription>
          </Alert>
        )}

        <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleCapture}
            disabled={!isActive || cameraLoading}
            className="flex-1"
          >
            {cameraLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </>
            )}
          </Button>
        </div>

        {!isTextDetectionSupported() && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Text detection is not supported in this browser. The captured image will be saved but text extraction may not work.
            </AlertDescription>
          </Alert>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4 bg-muted/50">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Quick Add Demographics
        </h4>
        {parseResult && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!parseResult ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="pastedText">Paste demographics text or use camera</Label>
            <Textarea
              id="pastedText"
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste patient demographics here (e.g., from a form or document)..."
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleParse}
              disabled={!pastedText.trim()}
              className="flex-1"
            >
              Parse Text
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenCamera}
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {capturedImage && ocrStatus === 'processing' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Extracting text from image...
            </div>
          )}

          {ocrStatus === 'error' && ocrError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{ocrError}</AlertDescription>
            </Alert>
          )}
        </>
      ) : (
        <>
          <Separator />
          
          <div className="space-y-3">
            <h5 className="text-sm font-medium">Edit Parsed Values</h5>
            
            {editedValues.mrn !== undefined && (
              <div className="space-y-1">
                <Label htmlFor="edit-mrn" className="text-xs">MRN</Label>
                <Input
                  id="edit-mrn"
                  value={editedValues.mrn || ''}
                  onChange={(e) => handleEditField('mrn', e.target.value)}
                />
              </div>
            )}

            {editedValues.patientFirstName !== undefined && (
              <div className="space-y-1">
                <Label htmlFor="edit-firstName" className="text-xs">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={editedValues.patientFirstName || ''}
                  onChange={(e) => handleEditField('patientFirstName', e.target.value)}
                />
              </div>
            )}

            {editedValues.patientLastName !== undefined && (
              <div className="space-y-1">
                <Label htmlFor="edit-lastName" className="text-xs">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={editedValues.patientLastName || ''}
                  onChange={(e) => handleEditField('patientLastName', e.target.value)}
                />
              </div>
            )}

            {editedValues.dateOfBirth !== undefined && (
              <div className="space-y-1">
                <Label htmlFor="edit-dob" className="text-xs">Date of Birth</Label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={editedValues.dateOfBirth || ''}
                  onChange={(e) => handleEditField('dateOfBirth', e.target.value)}
                />
              </div>
            )}

            {editedValues.species !== undefined && (
              <div className="space-y-1">
                <Label htmlFor="edit-species" className="text-xs">Species</Label>
                <Select
                  value={editedValues.species || ''}
                  onValueChange={(value) => handleEditField('species', value)}
                >
                  <SelectTrigger id="edit-species">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="canine">Canine</SelectItem>
                    <SelectItem value="feline">Feline</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {editedValues.breed !== undefined && (
              <div className="space-y-1">
                <Label htmlFor="edit-breed" className="text-xs">Breed</Label>
                <Input
                  id="edit-breed"
                  value={editedValues.breed || ''}
                  onChange={(e) => handleEditField('breed', e.target.value)}
                />
              </div>
            )}

            {editedValues.sex !== undefined && (
              <div className="space-y-1">
                <Label htmlFor="edit-sex" className="text-xs">Sex</Label>
                <Select
                  value={editedValues.sex || ''}
                  onValueChange={(value) => handleEditField('sex', value)}
                >
                  <SelectTrigger id="edit-sex">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="maleNeutered">Male Neutered</SelectItem>
                    <SelectItem value="femaleSpayed">Female Spayed</SelectItem>
                    <SelectItem value="unknown_">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {editedValues.arrivalDate !== undefined && (
              <div className="space-y-1">
                <Label htmlFor="edit-arrivalDate" className="text-xs">Arrival Date</Label>
                <Input
                  id="edit-arrivalDate"
                  type="date"
                  value={editedValues.arrivalDate || ''}
                  onChange={(e) => handleEditField('arrivalDate', e.target.value)}
                />
              </div>
            )}
          </div>

          {parseResult.notFound.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Not found: {parseResult.notFound.map(getFieldLabel).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          {parseResult.uncertain.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Uncertain: {parseResult.uncertain.map(getFieldLabel).join(', ')}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            onClick={handleApply}
            disabled={!editedValues || Object.keys(editedValues).length === 0}
            className="w-full"
          >
            Apply to Form
          </Button>
        </>
      )}
    </Card>
  );
}
