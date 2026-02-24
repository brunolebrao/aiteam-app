'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MoreHorizontal, 
  Plus, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Circle,
  PlayCircle,
  PauseCircle,
  XCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TasksByStatus, TaskWithAgent } from '@/hooks/useTasks'
import { Agent } from '@/lib/supabase'

const COLUMNS = [
  { id: 'backlog', title: 'Backlog', icon: Circle, color: 'text-slate-500' },
  { id: 'todo', title: 'To Do', icon: PlayCircle, color: 'text-blue-500' },
  { id: 'doing', title: 'Doing', icon: Clock, color: 'text-yellow-500' },
  { id: 'review', title: 'Review', icon: PauseCircle, color: 'text-purple-500' },
  { id: 'done', title: 'Done', icon: CheckCircle2, color: 'text-green-500' },
  { id: 'blocked', title: 'Blocked', icon: XCircle, color: 'text-red-500' },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

interface KanbanBoardProps {
  tasksByStatus: TasksByStatus
  agents: Agent[]
  onMoveTask: (taskId: string, newStatus: string, newOrder: number) => Promise<void>
  onAssignAgent: (taskId: string, agentId: string | null) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  onEditTask: (task: TaskWithAgent) => void
  onNewTask: () => void
}

function TaskCard({ 
  task, 
  index, 
  agents,
  onAssign,
  onDelete,
  onEdit,
}: { 
  task: TaskWithAgent
  index: number
  agents: Agent[]
  onAssign: (agentId: string | null) => void
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-2 ${snapshot.isDragging ? 'rotate-2' : ''}`}
        >
          <Card className={`hover:shadow-md transition-shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{task.titulo}</p>
                  {task.descricao && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {task.descricao}
                    </p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Badge variant="secondary" className={`text-xs ${PRIORITY_COLORS[task.prioridade]}`}>
                  {PRIORITY_LABELS[task.prioridade]}
                </Badge>

                {task.tags?.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      {task.assigned_agent ? (
                        <span className="flex items-center gap-1">
                          <span>{task.assigned_agent.avatar_emoji}</span>
                          <span className="text-xs">{task.assigned_agent.nome}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="text-xs">Atribuir</span>
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => onAssign(null)}>
                      <span className="text-muted-foreground">Nenhum</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {agents.map(agent => (
                      <DropdownMenuItem 
                        key={agent.id} 
                        onClick={() => onAssign(agent.id)}
                      >
                        <span className="mr-2">{agent.avatar_emoji}</span>
                        {agent.nome}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {agent.papel.toUpperCase()}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {task.due_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  )
}

function Column({ 
  column, 
  tasks, 
  agents,
  onAssign,
  onDelete,
  onEdit,
  onNewTask,
}: { 
  column: typeof COLUMNS[0]
  tasks: TaskWithAgent[]
  agents: Agent[]
  onAssign: (taskId: string, agentId: string | null) => void
  onDelete: (taskId: string) => void
  onEdit: (task: TaskWithAgent) => void
  onNewTask: () => void
}) {
  const Icon = column.icon

  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${column.color}`} />
          <h3 className="font-semibold text-sm">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
        {column.id === 'backlog' && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onNewTask}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[200px] p-2 rounded-lg transition-colors ${
              snapshot.isDraggingOver ? 'bg-muted/50' : 'bg-muted/20'
            }`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                agents={agents}
                onAssign={(agentId) => onAssign(task.id, agentId)}
                onDelete={() => onDelete(task.id)}
                onEdit={() => onEdit(task)}
              />
            ))}
            {provided.placeholder}
            
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                Arraste tasks aqui
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export function KanbanBoard({
  tasksByStatus,
  agents,
  onMoveTask,
  onAssignAgent,
  onDeleteTask,
  onEditTask,
  onNewTask,
}: KanbanBoardProps) {
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Dropped outside
    if (!destination) return

    // Same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return

    const newStatus = destination.droppableId
    const newOrder = destination.index

    await onMoveTask(draggableId, newStatus, newOrder)
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(column => (
          <Column
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id as keyof TasksByStatus]}
            agents={agents}
            onAssign={onAssignAgent}
            onDelete={onDeleteTask}
            onEdit={onEditTask}
            onNewTask={onNewTask}
          />
        ))}
      </div>
    </DragDropContext>
  )
}
