import { useState } from 'react';
import { useAddTodoItem, useToggleTodoComplete, useDeleteTodoItem } from '../../hooks/useQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ToDoItem } from '../../backend';

interface ToDoSectionProps {
  caseId: bigint;
  todos: ToDoItem[];
}

export default function ToDoSection({ caseId, todos }: ToDoSectionProps) {
  const [newTodoText, setNewTodoText] = useState('');
  const addTodo = useAddTodoItem();
  const toggleTodo = useToggleTodoComplete();
  const deleteTodo = useDeleteTodoItem();

  const handleAddTodo = async () => {
    if (!newTodoText.trim()) {
      toast.error('Please enter a to-do item');
      return;
    }

    try {
      await addTodo.mutateAsync({ caseId, description: newTodoText.trim() });
      setNewTodoText('');
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>To-Do List</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Add a new to-do item..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddTodo();
              }
            }}
          />
          <Button
            onClick={handleAddTodo}
            disabled={addTodo.isPending || !newTodoText.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No to-do items yet. Add one above to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {todos.map((todo) => (
              <div
                key={todo.id.toString()}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={todo.complete}
                  onCheckedChange={() => handleToggleTodo(todo.id)}
                  disabled={toggleTodo.isPending}
                />
                <span
                  className={`flex-1 ${
                    todo.complete ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {todo.description}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteTodo(todo.id)}
                  disabled={deleteTodo.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
