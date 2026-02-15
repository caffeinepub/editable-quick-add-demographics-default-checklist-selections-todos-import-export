import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetCase, useUpdateCase, useDeleteCase } from '../hooks/useQueries';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { getCaseCache } from '../utils/offlineDb';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import CaseForm from '../components/cases/CaseForm';
import ToDoSection from '../components/cases/ToDoSection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, WifiOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import type { CaseFormData } from '../components/cases/CaseForm';
import { useState, useEffect } from 'react';

export default function CaseDetailPage() {
  const { caseId } = useParams({ from: '/cases/$caseId' });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const { isOffline } = useOfflineStatus();
  const caseIdBigInt = BigInt(caseId);
  const { data: caseData, isLoading, error } = useGetCase(caseIdBigInt);
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();
  const [cachedCase, setCachedCase] = useState<typeof caseData>(null);

  const principal = identity?.getPrincipal().toString();

  useEffect(() => {
    if (isOffline && !caseData && principal) {
      getCaseCache(principal, caseId).then(setCachedCase);
    }
  }, [isOffline, caseData, principal, caseId]);

  const displayCase = caseData || cachedCase;

  const handleSubmit = async (data: CaseFormData) => {
    try {
      await updateCase.mutateAsync({
        id: caseIdBigInt,
        data,
        todos: displayCase?.todos,
      });
      toast.success('Case updated successfully');
    } catch (error) {
      toast.error('Failed to update case');
      console.error('Error updating case:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCase.mutateAsync(caseIdBigInt);
      toast.success('Case deleted successfully');
      navigate({ to: '/' });
    } catch (error) {
      toast.error('Failed to delete case');
      console.error('Error deleting case:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading case...</p>
        </div>
      </div>
    );
  }

  if (!displayCase && isOffline) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Case Not Available</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <WifiOff className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Offline Mode</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  This case hasn't been loaded while online yet. Connect to the internet to view it.
                </p>
              </div>
              <Button onClick={() => navigate({ to: '/' })}>
                Back to Cases
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!displayCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Case Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              The requested case could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/' })}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {displayCase.patientFirstName} {displayCase.patientLastName}
            </h1>
            <p className="text-muted-foreground mt-1">MRN: {displayCase.mrn}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isOffline}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Case
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this case and all associated data. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Information</CardTitle>
          <CardDescription>Update the patient details and case information</CardDescription>
        </CardHeader>
        <CardContent>
          <CaseForm
            initialData={displayCase}
            onSubmit={handleSubmit}
            onCancel={() => navigate({ to: '/' })}
            isSubmitting={updateCase.isPending}
          />
        </CardContent>
      </Card>

      <ToDoSection caseId={caseIdBigInt} todos={displayCase.todos} />
    </div>
  );
}
