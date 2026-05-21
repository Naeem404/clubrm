//stub database
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  status: 'Pending' | 'Completed';
}