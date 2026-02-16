import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { SurgeryCase, ToDoItem } from '../backend';
import type { CaseFormData } from '../components/cases/CaseForm';
import {
  saveCaseListCache,
  getCaseListCache,
  saveCaseCache,
  getCaseCache,
} from '../utils/offlineDb';
import { enqueueOperation, isNetworkError } from '../utils/offlineQueue';
import type {
  CreateCaseOperation,
  UpdateCaseOperation,
  DeleteCaseOperation,
  ToggleChecklistOperation,
  AddTodoOperation,
  ToggleTodoOperation,
  DeleteTodoOperation,
} from '../types/offlineOps';

// Case Queries
export function useListCases() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString();

  return useQuery<SurgeryCase[]>({
    queryKey: ['cases'],
    queryFn: async () => {
      if (!actor || !principal) return [];
      
      try {
        const cases = await actor.listCases();
        // Cache the result
        await saveCaseListCache(principal, cases);
        return cases;
      } catch (error) {
        // If network error, try to load from cache
        if (isNetworkError(error)) {
          const cached = await getCaseListCache(principal);
          if (cached) {
            return cached;
          }
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useGetCase(id: bigint) {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString();

  return useQuery<SurgeryCase | null>({
    queryKey: ['case', id.toString()],
    queryFn: async () => {
      if (!actor || !principal) return null;
      
      try {
        const caseData = await actor.getCase(id);
        // Cache the result
        if (caseData) {
          await saveCaseCache(principal, caseData);
        }
        return caseData;
      } catch (error) {
        // If network error, try to load from cache
        if (isNetworkError(error)) {
          const cached = await getCaseCache(principal, id.toString());
          if (cached) {
            return cached;
          }
        }
        throw error;
      }
    },
    enabled: !!actor && !isFetching && !!principal,
  });
}

export function useGetCaseCount() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString();

  return useQuery<number>({
    queryKey: ['caseCount'],
    queryFn: async () => {
      if (!actor || !principal) return 0;
      const count = await actor.getCaseCount();
      return Number(count);
    },
    enabled: !!actor && !isFetching && !!principal,
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
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async (data: CaseFormData) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        const todoDescriptions = getCheckedTodoDescriptions(data);
        const id = await actor.createCase(
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
        return id;
      } catch (error) {
        if (isNetworkError(error)) {
          // Queue for later
          const tempId = `temp-${Date.now()}`;
          const operation: Omit<CreateCaseOperation, 'id'> = {
            type: 'createCase',
            principal,
            data,
            tempId,
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          // Optimistic update
          queryClient.setQueryData<SurgeryCase[]>(['cases'], (old = []) => [
            ...old,
            {
              id: BigInt(tempId),
              ...data,
              arrivalDate: data.arrivalDate || BigInt(Date.now() * 1000000),
              todos: [],
            } as SurgeryCase,
          ]);
          
          return BigInt(tempId);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['caseCount'] });
    },
  });
}

export function useUpdateCase() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async ({ id, data, todos }: { id: bigint; data: CaseFormData; todos?: ToDoItem[] }) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      // Get current case to preserve todos if not provided
      let todosToSave = todos || [];
      if (!todos) {
        const currentCase = await actor.getCase(id);
        if (currentCase) {
          todosToSave = currentCase.todos;
        }
      }

      try {
        await actor.updateCase(
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
      } catch (error) {
        if (isNetworkError(error)) {
          // Queue for later
          const operation: Omit<UpdateCaseOperation, 'id'> = {
            type: 'updateCase',
            principal,
            caseId: id,
            data,
            todos: todosToSave,
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          // Optimistic update
          queryClient.setQueryData<SurgeryCase[]>(['cases'], (old = []) =>
            old.map((c) =>
              c.id === id
                ? {
                    ...c,
                    ...data,
                    todos: todosToSave,
                  }
                : c
            )
          );
          
          return;
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', variables.id.toString()] });
      queryClient.invalidateQueries({ queryKey: ['caseCount'] });
    },
  });
}

export function useDeleteCase() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        await actor.deleteCase(id);
      } catch (error) {
        if (isNetworkError(error)) {
          // Queue for later
          const operation: Omit<DeleteCaseOperation, 'id'> = {
            type: 'deleteCase',
            principal,
            caseId: id,
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          // Optimistic update
          queryClient.setQueryData<SurgeryCase[]>(['cases'], (old = []) =>
            old.filter((c) => c.id !== id)
          );
          
          return;
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['caseCount'] });
    },
  });
}

// Checklist toggle mutations
export function useToggleDischargeNotes() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        return await actor.toggleDischargeNotes(id);
      } catch (error) {
        if (isNetworkError(error)) {
          const operation: Omit<ToggleChecklistOperation, 'id'> = {
            type: 'toggleChecklist',
            principal,
            caseId: id,
            field: 'dischargeNotes',
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          // Optimistic update
          queryClient.setQueryData<SurgeryCase | null>(['case', id.toString()], (old) =>
            old ? { ...old, dischargeNotesComplete: !old.dischargeNotesComplete } : null
          );
          
          return !queryClient.getQueryData<SurgeryCase>(['case', id.toString()])?.dischargeNotesComplete;
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
    },
  });
}

export function useTogglePdvmNotified() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        return await actor.togglePdvmNotified(id);
      } catch (error) {
        if (isNetworkError(error)) {
          const operation: Omit<ToggleChecklistOperation, 'id'> = {
            type: 'toggleChecklist',
            principal,
            caseId: id,
            field: 'pdvmNotified',
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          queryClient.setQueryData<SurgeryCase | null>(['case', id.toString()], (old) =>
            old ? { ...old, pdvmNotified: !old.pdvmNotified } : null
          );
          
          return !queryClient.getQueryData<SurgeryCase>(['case', id.toString()])?.pdvmNotified;
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
    },
  });
}

export function useToggleLabs() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        return await actor.toggleLabs(id);
      } catch (error) {
        if (isNetworkError(error)) {
          const operation: Omit<ToggleChecklistOperation, 'id'> = {
            type: 'toggleChecklist',
            principal,
            caseId: id,
            field: 'labs',
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          queryClient.setQueryData<SurgeryCase | null>(['case', id.toString()], (old) =>
            old ? { ...old, labsComplete: !old.labsComplete } : null
          );
          
          return !queryClient.getQueryData<SurgeryCase>(['case', id.toString()])?.labsComplete;
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
    },
  });
}

export function useToggleHisto() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        return await actor.toggleHisto(id);
      } catch (error) {
        if (isNetworkError(error)) {
          const operation: Omit<ToggleChecklistOperation, 'id'> = {
            type: 'toggleChecklist',
            principal,
            caseId: id,
            field: 'histo',
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          queryClient.setQueryData<SurgeryCase | null>(['case', id.toString()], (old) =>
            old ? { ...old, histoComplete: !old.histoComplete } : null
          );
          
          return !queryClient.getQueryData<SurgeryCase>(['case', id.toString()])?.histoComplete;
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
    },
  });
}

export function useToggleSurgeryReport() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        return await actor.toggleSurgeryReport(id);
      } catch (error) {
        if (isNetworkError(error)) {
          const operation: Omit<ToggleChecklistOperation, 'id'> = {
            type: 'toggleChecklist',
            principal,
            caseId: id,
            field: 'surgeryReport',
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          queryClient.setQueryData<SurgeryCase | null>(['case', id.toString()], (old) =>
            old ? { ...old, surgeryReportComplete: !old.surgeryReportComplete } : null
          );
          
          return !queryClient.getQueryData<SurgeryCase>(['case', id.toString()])?.surgeryReportComplete;
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
    },
  });
}

export function useToggleImaging() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        return await actor.toggleImaging(id);
      } catch (error) {
        if (isNetworkError(error)) {
          const operation: Omit<ToggleChecklistOperation, 'id'> = {
            type: 'toggleChecklist',
            principal,
            caseId: id,
            field: 'imaging',
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          queryClient.setQueryData<SurgeryCase | null>(['case', id.toString()], (old) =>
            old ? { ...old, imagingComplete: !old.imagingComplete } : null
          );
          
          return !queryClient.getQueryData<SurgeryCase>(['case', id.toString()])?.imagingComplete;
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
    },
  });
}

export function useToggleCulture() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        return await actor.toggleCulture(id);
      } catch (error) {
        if (isNetworkError(error)) {
          const operation: Omit<ToggleChecklistOperation, 'id'> = {
            type: 'toggleChecklist',
            principal,
            caseId: id,
            field: 'culture',
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          queryClient.setQueryData<SurgeryCase | null>(['case', id.toString()], (old) =>
            old ? { ...old, cultureComplete: !old.cultureComplete } : null
          );
          
          return !queryClient.getQueryData<SurgeryCase>(['case', id.toString()])?.cultureComplete;
        }
        throw error;
      }
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
    },
  });
}

// To-do item mutations
export function useAddTodoItem() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async ({ caseId, description }: { caseId: bigint; description: string }) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        return await actor.addTodoItem(caseId, description);
      } catch (error) {
        if (isNetworkError(error)) {
          const tempId = `temp-${Date.now()}`;
          const operation: Omit<AddTodoOperation, 'id'> = {
            type: 'addTodo',
            principal,
            caseId,
            description,
            tempId,
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          // Optimistic update
          const tempIdBigInt = BigInt(Date.now());
          queryClient.setQueryData<SurgeryCase | null>(['case', caseId.toString()], (old) =>
            old
              ? {
                  ...old,
                  todos: [
                    ...old.todos,
                    { id: tempIdBigInt, description, complete: false },
                  ],
                }
              : null
          );
          
          return tempIdBigInt;
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId.toString()] });
    },
  });
}

export function useToggleTodoComplete() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async ({ caseId, todoId }: { caseId: bigint; todoId: bigint }) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        await actor.toggleTodoComplete(caseId, todoId);
      } catch (error) {
        if (isNetworkError(error)) {
          const operation: Omit<ToggleTodoOperation, 'id'> = {
            type: 'toggleTodo',
            principal,
            caseId,
            todoId,
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          // Optimistic update
          queryClient.setQueryData<SurgeryCase | null>(['case', caseId.toString()], (old) =>
            old
              ? {
                  ...old,
                  todos: old.todos.map((todo) =>
                    todo.id === todoId ? { ...todo, complete: !todo.complete } : todo
                  ),
                }
              : null
          );
          
          return;
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId.toString()] });
    },
  });
}

export function useDeleteTodoItem() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const principal = identity?.getPrincipal().toString();

  return useMutation({
    mutationFn: async ({ caseId, todoId }: { caseId: bigint; todoId: bigint }) => {
      if (!actor || !principal) throw new Error('Actor not available');
      
      try {
        await actor.deleteTodoItem(caseId, todoId);
      } catch (error) {
        if (isNetworkError(error)) {
          const operation: Omit<DeleteTodoOperation, 'id'> = {
            type: 'deleteTodo',
            principal,
            caseId,
            todoId,
            createdAt: Date.now(),
            status: 'pending',
          };
          await enqueueOperation(operation);
          
          // Optimistic update
          queryClient.setQueryData<SurgeryCase | null>(['case', caseId.toString()], (old) =>
            old
              ? {
                  ...old,
                  todos: old.todos.filter((todo) => todo.id !== todoId),
                }
              : null
          );
          
          return;
        }
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', variables.caseId.toString()] });
    },
  });
}

// Export/Import mutations
export function useExportCases() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return await actor.exportCases();
    },
  });
}

export function useImportCases() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cases: SurgeryCase[]) => {
      if (!actor) throw new Error('Actor not available');
      await actor.importCases(cases);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['caseCount'] });
    },
  });
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: { name: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}
