import type { SurgeryCase, ToDoItem, Species, Sex } from '../backend';
import type { CaseFormData } from '../components/cases/CaseForm';

export type OperationStatus = 'pending' | 'failed' | 'succeeded';

export interface BaseOperation {
  id?: number;
  principal: string;
  createdAt: number;
  status: OperationStatus;
  lastError?: string;
}

export interface CreateCaseOperation extends BaseOperation {
  type: 'createCase';
  data: CaseFormData;
  tempId: string;
}

export interface UpdateCaseOperation extends BaseOperation {
  type: 'updateCase';
  caseId: bigint;
  data: CaseFormData;
  todos: ToDoItem[];
}

export interface DeleteCaseOperation extends BaseOperation {
  type: 'deleteCase';
  caseId: bigint;
}

export interface ToggleChecklistOperation extends BaseOperation {
  type: 'toggleChecklist';
  caseId: bigint;
  field: 'dischargeNotes' | 'pdvmNotified' | 'labs' | 'histo' | 'surgeryReport' | 'imaging' | 'culture';
}

export interface AddTodoOperation extends BaseOperation {
  type: 'addTodo';
  caseId: bigint;
  description: string;
  tempId: string;
}

export interface ToggleTodoOperation extends BaseOperation {
  type: 'toggleTodo';
  caseId: bigint;
  todoId: bigint;
}

export interface DeleteTodoOperation extends BaseOperation {
  type: 'deleteTodo';
  caseId: bigint;
  todoId: bigint;
}

export type QueuedOperation =
  | CreateCaseOperation
  | UpdateCaseOperation
  | DeleteCaseOperation
  | ToggleChecklistOperation
  | AddTodoOperation
  | ToggleTodoOperation
  | DeleteTodoOperation;
