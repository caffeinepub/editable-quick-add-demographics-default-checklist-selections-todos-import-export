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
          queryClient.setQueryData<SurgeryCase | null>(['case', id.toString()], (old) => {
            if (!old) return null;
            return {
              ...old,
              ...data,
              todos: todosToSave,
            };
          });
          
          return;
        }
        throw error;
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
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
    },
  });
}

// Checklist Toggle Mutations
function createToggleMutation(field: 'dischargeNotes' | 'pdvmNotified' | 'labs' | 'histo' | 'surgeryReport' | 'imaging' | 'culture', actorMethod: string) {
  return function useToggle() {
    const { actor } = useActor();
    const { identity } = useInternetIdentity();
    const queryClient = useQueryClient();
    const principal = identity?.getPrincipal().toString();

    return useMutation({
      mutationFn: async (id: bigint) => {
        if (!actor || !principal) throw new Error('Actor not available');
        
        try {
          return await (actor as any)[actorMethod](id);
        } catch (error) {
          if (isNetworkError(error)) {
            // Queue for later
            const operation: Omit<ToggleChecklistOperation, 'id'> = {
              type: 'toggleChecklist',
              principal,
              caseId: id,
              field,
              createdAt: Date.now(),
              status: 'pending',
            };
            await enqueueOperation(operation);
            
            // Optimistic update
            queryClient.setQueryData<SurgeryCase | null>(['case', id.toString()], (old) => {
              if (!old) return null;
              return {
                ...old,
                [field + 'Complete']: !(old as any)[field + 'Complete'],
              };
            });
            
            return !(queryClient.getQueryData<SurgeryCase>(['case', id.toString()]) as any)?.[field + 'Complete'];
          }
          throw error;
        }
      },
      onSuccess: (_, id) => {
        queryClient.invalidateQueries({ queryKey: ['case', id.toString()] });
        queryClient.invalidateQueries({ queryKey: ['cases'] });
      },
    });
  };
}

export const useToggleDischargeNotes = createToggleMutation('dischargeNotes', 'toggleDischargeNotes');
export const useTogglePdvmNotified = createToggleMutation('pdvmNotified', 'togglePdvmNotified');
export const useToggleLabs = createToggleMutation('labs', 'toggleLabs');
export const useToggleHisto = createToggleMutation('histo', 'toggleHisto');
export const useToggleSurgeryReport = createToggleMutation('surgeryReport', 'toggleSurgeryReport');
export const useToggleImaging = createToggleMutation('imaging', 'toggleImaging');
export const useToggleCulture = createToggleMutation('culture', 'toggleCulture');

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
          queryClient.setQueryData<SurgeryCase | null>(['case', caseId.toString()], (old) => {
            if (!old) return null;
            return {
              ...old,
              todos: [
                ...old.todos,
                { id: BigInt(tempId), description, complete: false },
              ],
            };
          });
          
          return BigInt(tempId);
        }
        throw error;
      }
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
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
          queryClient.setQueryData<SurgeryCase | null>(['case', caseId.toString()], (old) => {
            if (!old) return null;
            return {
              ...old,
              todos: old.todos.map((t) =>
                t.id === todoId ? { ...t, complete: !t.complete } : t
              ),
            };
          });
          
          return;
        }
        throw error;
      }
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
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
          queryClient.setQueryData<SurgeryCase | null>(['case', caseId.toString()], (old) => {
            if (!old) return null;
            return {
              ...old,
              todos: old.todos.filter((t) => t.id !== todoId),
            };
          });
          
          return;
        }
        throw error;
      }
    },
    onSuccess: (_, { caseId }) => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
