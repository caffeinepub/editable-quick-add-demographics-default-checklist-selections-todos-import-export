import { useNavigate } from '@tanstack/react-router';
import { useCreateCase } from '../hooks/useQueries';
import CaseForm from '../components/cases/CaseForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { CaseFormData } from '../components/cases/CaseForm';

export default function NewCasePage() {
  const navigate = useNavigate();
  const createCase = useCreateCase();

  const handleSubmit = async (data: CaseFormData) => {
    try {
      await createCase.mutateAsync(data);
      toast.success('Case created successfully');
      navigate({ to: '/' });
    } catch (error) {
      toast.error('Failed to create case');
      console.error('Error creating case:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: '/' })}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Surgery Case</h1>
          <p className="text-muted-foreground mt-1">Create a new patient case record</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case Information</CardTitle>
          <CardDescription>
            Enter the patient details and case information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CaseForm
            onSubmit={handleSubmit}
            onCancel={() => navigate({ to: '/' })}
            isSubmitting={createCase.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
