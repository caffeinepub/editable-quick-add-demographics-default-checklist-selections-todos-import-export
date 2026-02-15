import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useAddTodoItem, useToggleTodoComplete, useDeleteTodoItem } from '../../hooks/useQueries';
import { toast } from 'sonner';
import type { ToDoItem } from '../../backend';

interface ToDoSectionProps {
  caseId: bigint;
  todos: ToDoItem[];
}

export default function ToDoSection({ caseId, todos }: ToDoSectionProps) {
  const [newTodoDescription, setNewTodoDescription] = useState('');
  const addTodo = useAddTodoItem();
  const toggleTodo = useToggleTodoComplete();
  const deleteTodo = useDeleteTodoItem();

  const handleAddTodo = async () => {
    if (!newTodoDescription.trim()) {
      toast.error('Please enter a to-do description');
      return;
    }

    try {
      await addTodo.mutateAsync({ caseId, description: newTodoDescription.trim() });
      setNewTodoDescription('');
      toast.success('To-do item added');
    } catch (error) {
      toast.error('Failed to add to-do item');
      console.error('Error adding to-do:', error);
    }
  };

  const handleToggleTodo = async (todoId: bigint) => {
    try {
      await toggleTodo.mutateAsync({ caseId, todoId });
    } catch (error) {
      toast.error('Failed to update to-do item');
      console.error('Error toggling to-do:', error);
    }
  };

  const handleDeleteTodo = async (todoId: bigint) => {
    try {
      await deleteTodo.mutateAsync({ caseId, todoId });
      toast.success('To-do item deleted');
    } catch (error) {
      toast.error('Failed to delete to-do item');
      console.error('Error deleting to-do:', error);
    }
  };

  const incompleteTodos = todos.filter(t => !t.complete);
  const completedTodos = todos.filter(t => t.complete);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          To-Do Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new to-do */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a new to-do item..."
            value={newTodoDescription}
            onChange={(e) => setNewTodoDescription(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTodo();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddTodo}
            disabled={addTodo.isPending || !newTodoDescription.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {todos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Circle className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No to-do items yet</p>
            <p className="text-xs mt-1">Add items above or check checklist items when creating a case</p>
          </div>
        )}

        {/* Incomplete to-dos */}
        {incompleteTodos.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Active</Label>
            {incompleteTodos.map((todo) => (
              <div
                key={todo.id.toString()}
                className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={todo.complete}
                  onCheckedChange={() => handleToggleTodo(todo.id)}
                  disabled={toggleTodo.isPending}
                />
                <span className="flex-1 text-sm">{todo.description}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteTodo(todo.id)}
                  disabled={deleteTodo.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Completed to-dos */}
        {completedTodos.length > 0 && (
          <>
            {incompleteTodos.length > 0 && <Separator />}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Completed</Label>
              {completedTodos.map((todo) => (
                <div
                  key={todo.id.toString()}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 opacity-60"
                >
                  <Checkbox
                    checked={todo.complete}
                    onCheckedChange={() => handleToggleTodo(todo.id)}
                    disabled={toggleTodo.isPending}
                  />
                  <span className="flex-1 text-sm line-through">{todo.description}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteTodo(todo.id)}
                    disabled={deleteTodo.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
