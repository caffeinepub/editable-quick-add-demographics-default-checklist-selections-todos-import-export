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
      await stopCamera();

      // Extract text
      setOcrStatus('processing');
      const result = await extractTextFromImage(photoFile);
      
      if (result.success) {
        setPastedText(result.text);
        setOcrStatus('success');
        setOcrError('');
        // Auto-parse the extracted text
        const parseResult = parseDemographics(result.text);
        setParseResult(parseResult);
        setEditedValues({ ...parseResult.parsed });
      } else {
        setOcrStatus('error');
        setOcrError(result.error || 'Failed to extract text');
      }
    }
  };

  const hasChanges = editedValues && Object.keys(editedValues).length > 0;
  const canApply = hasChanges;

  return (
    <Card className="p-6 bg-muted/30">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quick Add Demographics
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Paste or scan patient information to auto-fill fields
            </p>
          </div>
          {(pastedText || capturedImage) && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {!showCamera && !capturedImage && (
          <>
            <div className="space-y-2">
              <Label htmlFor="quickAddText" className="text-xs">
                Paste demographics text
              </Label>
              <Textarea
                id="quickAddText"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste patient demographics here (e.g., MRN: 12345, Name: Max Smith, DOB: 01/15/2020, Species: Canine, Breed: Labrador, Sex: Male)"
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleParse}
                disabled={!pastedText.trim()}
              >
                Parse Text
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenCamera}
                disabled={isSupported === false}
              >
                <Camera className="h-4 w-4 mr-2" />
                Use Camera
              </Button>
            </div>

            {isSupported === false && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Camera is not supported on this device. Please use the paste option.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {showCamera && !capturedImage && (
          <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: '300px', aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ minHeight: '300px' }}
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {cameraError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {cameraError.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleCapture}
                disabled={!isActive || cameraLoading}
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseCamera}
              >
                Cancel
              </Button>
            </div>

            {!isTextDetectionSupported() && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Text detection is not supported in your browser. The captured image may not extract text automatically. Consider using the paste option instead.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {capturedImage && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border">
              <img src={capturedImage} alt="Captured" className="w-full h-auto" />
            </div>

            {ocrStatus === 'processing' && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription className="text-xs">
                  Extracting text from image...
                </AlertDescription>
              </Alert>
            )}

            {ocrStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {ocrError}
                </AlertDescription>
              </Alert>
            )}

            {ocrStatus === 'success' && pastedText && (
              <div className="space-y-2">
                <Label className="text-xs">Extracted text:</Label>
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  rows={4}
                  className="text-sm"
                />
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseCamera}
            >
              <Camera className="h-4 w-4 mr-2" />
              Take Another Photo
            </Button>
          </div>
        )}

        {parseResult && (
          <>
            <Separator />
            <div className="space-y-3">
              <h5 className="text-xs font-semibold">Edit Parsed Values</h5>

              {!hasChanges && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    No fields could be recognized from the provided text. Please check the format and try again.
                  </AlertDescription>
                </Alert>
              )}

              {hasChanges && (
                <>
                  <div className="space-y-3">
                    {editedValues.mrn !== undefined && (
                      <div className="space-y-1">
                        <Label htmlFor="edit-mrn" className="text-xs font-medium">
                          {getFieldLabel('mrn')}
                        </Label>
                        <Input
                          id="edit-mrn"
                          value={editedValues.mrn || ''}
                          onChange={(e) => setEditedValues({ ...editedValues, mrn: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    )}

                    {editedValues.patientFirstName !== undefined && (
                      <div className="space-y-1">
                        <Label htmlFor="edit-firstName" className="text-xs font-medium">
                          {getFieldLabel('patientFirstName')}
                        </Label>
                        <Input
                          id="edit-firstName"
                          value={editedValues.patientFirstName || ''}
                          onChange={(e) => setEditedValues({ ...editedValues, patientFirstName: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    )}

                    {editedValues.patientLastName !== undefined && (
                      <div className="space-y-1">
                        <Label htmlFor="edit-lastName" className="text-xs font-medium">
                          {getFieldLabel('patientLastName')}
                        </Label>
                        <Input
                          id="edit-lastName"
                          value={editedValues.patientLastName || ''}
                          onChange={(e) => setEditedValues({ ...editedValues, patientLastName: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    )}

                    {editedValues.dateOfBirth !== undefined && (
                      <div className="space-y-1">
                        <Label htmlFor="edit-dob" className="text-xs font-medium">
                          {getFieldLabel('dateOfBirth')}
                        </Label>
                        <Input
                          id="edit-dob"
                          type="date"
                          value={editedValues.dateOfBirth || ''}
                          onChange={(e) => setEditedValues({ ...editedValues, dateOfBirth: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    )}

                    {editedValues.species !== undefined && (
                      <div className="space-y-1">
                        <Label htmlFor="edit-species" className="text-xs font-medium">
                          {getFieldLabel('species')}
                        </Label>
                        <Select
                          value={editedValues.species}
                          onValueChange={(value) => setEditedValues({ ...editedValues, species: value as Species })}
                        >
                          <SelectTrigger id="edit-species" className="text-sm">
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
                        <Label htmlFor="edit-breed" className="text-xs font-medium">
                          {getFieldLabel('breed')}
                        </Label>
                        <Input
                          id="edit-breed"
                          value={editedValues.breed || ''}
                          onChange={(e) => setEditedValues({ ...editedValues, breed: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    )}

                    {editedValues.sex !== undefined && (
                      <div className="space-y-1">
                        <Label htmlFor="edit-sex" className="text-xs font-medium">
                          {getFieldLabel('sex')}
                        </Label>
                        <Select
                          value={editedValues.sex}
                          onValueChange={(value) => setEditedValues({ ...editedValues, sex: value as Sex })}
                        >
                          <SelectTrigger id="edit-sex" className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="unknown_">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {editedValues.arrivalDate !== undefined && (
                      <div className="space-y-1">
                        <Label htmlFor="edit-arrival" className="text-xs font-medium">
                          {getFieldLabel('arrivalDate')}
                        </Label>
                        <Input
                          id="edit-arrival"
                          type="date"
                          value={editedValues.arrivalDate || ''}
                          onChange={(e) => setEditedValues({ ...editedValues, arrivalDate: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {parseResult.uncertain.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>Uncertain fields:</strong> {parseResult.uncertain.map(f => getFieldLabel(f as any)).join(', ')}. Please verify the values above.
                      </AlertDescription>
                    </Alert>
                  )}

                  {parseResult.notFound.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground">
                        Not found (will not be changed):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {parseResult.notFound.map((field) => (
                          <span
                            key={field}
                            className="text-xs bg-muted px-2 py-1 rounded"
                          >
                            {getFieldLabel(field as any)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleApply}
                    disabled={!canApply}
                    className="w-full"
                  >
                    Apply to Form
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
