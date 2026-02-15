import { useNavigate, useParams } from '@tanstack/react-router';
import { useGetCase, useUpdateCase, useDeleteCase } from '../hooks/useQueries';
import CaseForm from '../components/cases/CaseForm';
import ToDoSection from '../components/cases/ToDoSection';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { CaseFormData } from '../components/cases/CaseForm';

export default function CaseDetailPage() {
  const navigate = useNavigate();
  const { caseId } = useParams({ from: '/cases/$caseId' });
  const caseIdNum = BigInt(caseId);
  
  const { data: caseData, isLoading } = useGetCase(caseIdNum);
  const updateCase = useUpdateCase();
  const deleteCase = useDeleteCase();

  const handleSubmit = async (data: CaseFormData) => {
    try {
      // Preserve existing todos when updating
      await updateCase.mutateAsync({ 
        id: caseIdNum, 
        data,
        todos: caseData?.todos 
      });
      toast.success('Case updated successfully');
    } catch (error) {
      toast.error('Failed to update case');
      console.error('Error updating case:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCase.mutateAsync(caseIdNum);
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

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Case not found</h2>
        <p className="text-muted-foreground mb-6">The requested case could not be found</p>
        <Button onClick={() => navigate({ to: '/' })}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cases
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: '/' })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {caseData.patientFirstName} {caseData.patientLastName}
            </h1>
            <p className="text-muted-foreground mt-1">MRN: {caseData.mrn}</p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Case
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the case for{' '}
                {caseData.patientFirstName} {caseData.patientLastName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* To-Do Section */}
      <ToDoSection caseId={caseIdNum} todos={caseData.todos} />

      {/* Case Details Form */}
      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
          <CardDescription>
            Update patient information and case status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CaseForm
            initialData={caseData}
            onSubmit={handleSubmit}
            onCancel={() => navigate({ to: '/' })}
            isSubmitting={updateCase.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
