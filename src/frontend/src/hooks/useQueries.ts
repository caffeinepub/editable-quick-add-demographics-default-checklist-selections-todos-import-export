import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { SurgeryCase, ToDoItem } from '../backend';
import type { CaseFormData } from '../components/cases/CaseForm';

// Case Queries
export function useListCases() {
  const { actor, isFetching } = useActor();

  return useQuery<SurgeryCase[]>({
    queryKey: ['cases'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listCases();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCase(id: bigint) {
  const { actor, isFetching } = useActor();

  return useQuery<SurgeryCase | null>({
    queryKey: ['case', id.toString()],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCase(id);
    },
    enabled: !!actor && !isFetching,
  });
}

// Helper to map checklist items to to-do descriptions
function getCheckedTodoDescriptions(data: CaseFormData): string[] {
  const todos: string[] = [];
  if (data.dischargeNotesComplete) todos.push('Discharge Notes Complete');
  if (data.pdvmNotified) todos.push('pDVM Notified');
  if (data.labsComplete) todos.push('Labs Complete');
  if (data.histoComplete) todos.push('Histopathology Complete');
  if (data.surgeryReportComplete) todos.push('Surgery Report Complete');
  if (data.imagingComplete) todos.push('Imaging Complete');
  if (data.cultureComplete) todos.push('Culture Complete');
  return todos;
}

export function useCreateCase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CaseFormData) => {
      if (!actor) throw new Error('Actor not available');
      const todoDescriptions = getCheckedTodoDescriptions(data);
      return actor.createCase(
        data.mrn,
        data.patientFirstName,
        data.patientLastName,
        data.dateOfBirth,
        data.species,
        data.breed,
        data.sex,
        data.presentingComplaint,
        data.arrivalDate,
        data.dischargeNotesComplete,
        data.pdvmNotified,
        data.labsComplete,
        data.histoComplete,
        data.surgeryReportComplete,
        data.imagingComplete,
        data.cultureComplete,
        data.notes,
        todoDescriptions
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useUpdateCase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data, todos }: { id: bigint; data: CaseFormData; todos?: ToDoItem[] }) => {
      if (!actor) throw new Error('Actor not available');
      
      // Get current case to preserve todos if not provided
      let todosToSave = todos || [];
      if (!todos) {
        const currentCase = await actor.getCase(id);
        if (currentCase) {
          todosToSave = currentCase.todos;
        }
      }

      return actor.updateCase(
        id,
        data.mrn,
        data.patientFirstName,
        data.patientLastName,
        data.dateOfBirth,
        data.arrivalDate,
        data.species,
        data.breed,
        data.sex,
        data.presentingComplaint,
        data.dischargeNotesComplete,
        data.pdvmNotified,
        data.labsComplete,
        data.histoComplete,
        data.surgeryReportComplete,
        data.imagingComplete,
        data.cultureComplete,
        data.notes,
        todosToSave
      );
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
    },
  });
}

export function useDeleteCase() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteCase(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

// Checklist Toggle Mutations
export function useToggleDischargeNotes() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleDischargeNotes(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useTogglePdvmNotified() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.togglePdvmNotified(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useToggleLabs() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleLabs(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useToggleHisto() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleHisto(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useToggleSurgeryReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleSurgeryReport(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useToggleImaging() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleImaging(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useToggleCulture() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleCulture(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

// Export/Import
export function useExportCases() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.exportCases();
    },
  });
}

export function useImportCases() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cases: SurgeryCase[]) => {
      if (!actor) throw new Error('Actor not available');
      return actor.importCases(cases);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

// To-Do Item Mutations
export function useAddTodoItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, description }: { caseId: bigint; description: string }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.addTodoItem(caseId, description);
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useToggleTodoComplete() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, todoId }: { caseId: bigint; todoId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.toggleTodoComplete(caseId, todoId);
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useDeleteTodoItem() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ caseId, todoId }: { caseId: bigint; todoId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.deleteTodoItem(caseId, todoId);
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
