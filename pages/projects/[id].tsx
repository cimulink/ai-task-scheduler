import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { AssignmentPreviewModal } from '@/components/AssignmentPreviewModal'
import { AssignmentPreview } from '@/lib/ai/types'
import { TaskScheduler } from '@/lib/scheduling/taskScheduler'

interface Resource {
  id: string
  name: string
  role: string
  weeklyHours: number
  skills: string[]
}

interface Task {
  id: string
  title: string
  description: string | null
  estimatedHours: number | null
  priority: number
  status: string
  assignedTo: string | null
  parentTaskId?: string | null
  assignee?: Resource | null
  subtasks?: Task[]
}

interface Project {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
  tasks: Task[]
}

interface TaskItemProps {
  task: Task
  resources: Resource[]
  editingTask: string | null
  taskUpdates: Record<string, Partial<Task>>
  expandedTasks: Set<string>
  breakingIntoSubtasks: Set<string>
  taskTimelines: Map<string, any>
  resourceSchedules: Map<string, any>
  taskScheduler: TaskScheduler
  depth?: number
  onEdit: (task: Task) => void
  onSave: (taskId: string, updates: Partial<Task>) => void
  onCancel: (taskId: string) => void
  onUpdate: (taskId: string, field: keyof Task, value: any) => void
  onDelete: (taskId: string, taskTitle: string) => void
  onBreakIntoSubtasks: (taskId: string, taskTitle: string) => void
  onToggleExpansion: (taskId: string) => void
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  resources,
  editingTask,
  taskUpdates,
  expandedTasks,
  breakingIntoSubtasks,
  taskTimelines,
  resourceSchedules,
  taskScheduler,
  depth = 0,
  onEdit,
  onSave,
  onCancel,
  onUpdate,
  onDelete,
  onBreakIntoSubtasks,
  onToggleExpansion
}) => {
  const isExpanded = expandedTasks.has(task.id)
  const hasSubtasks = task.subtasks && task.subtasks.length > 0
  const isBreaking = breakingIntoSubtasks.has(task.id)
  const isEditing = editingTask === task.id
  const indentClass = depth > 0 ? `ml-${Math.min(depth * 6, 24)}` : ''

  // Get timeline information for this task
  const timeline = taskTimelines.get(task.id)
  const isScheduled = timeline?.isScheduled || false
  const estimatedStart = timeline?.estimatedStartDate
  const estimatedEnd = timeline?.estimatedEndDate

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'bg-red-100 text-red-800'
    if (priority >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className={`border-l-2 border-gray-100 ${indentClass}`}>
      <div className="p-4 border-b border-gray-100">
        {isEditing ? (
          // Edit Mode
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={taskUpdates[task.id]?.title || task.title}
                  onChange={(e) => onUpdate(task.id, 'title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={taskUpdates[task.id]?.estimatedHours || task.estimatedHours || ''}
                  onChange={(e) => onUpdate(task.id, 'estimatedHours', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={taskUpdates[task.id]?.description || task.description || ''}
                onChange={(e) => onUpdate(task.id, 'description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={taskUpdates[task.id]?.priority || task.priority}
                  onChange={(e) => onUpdate(task.id, 'priority', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={taskUpdates[task.id]?.status || task.status}
                  onChange={(e) => onUpdate(task.id, 'status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <select
                  value={taskUpdates[task.id]?.assignedTo || ''}
                  onChange={(e) => onUpdate(task.id, 'assignedTo', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name} ({resource.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <Button onClick={() => onSave(task.id, taskUpdates[task.id] || {})} size="sm">
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => onCancel(task.id)} size="sm">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          // View Mode
          <div className="space-y-3">
            {/* Task Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {hasSubtasks && (
                  <button
                    onClick={() => onToggleExpansion(task.id)}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                {hasSubtasks && (
                  <span className="text-xs text-gray-500">({task.subtasks?.length} subtasks)</span>
                )}
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit</span>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBreakIntoSubtasks(task.id, task.title)}
                  disabled={isBreaking}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  {isBreaking ? (
                    <div className="flex items-center space-x-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span>Breaking...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Break Down</span>
                    </div>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(task.id, task.title)}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  <div className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* Task Details */}
            {task.description && (
              <p className="text-sm text-gray-600 ml-7">{task.description}</p>
            )}

            <div className="flex items-center space-x-4 text-sm text-gray-500 ml-7">
              {task.estimatedHours && (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {task.estimatedHours}h
                </span>
              )}
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                Priority {task.priority}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ').toUpperCase()}
              </span>
              {task.assignee ? (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {task.assignee.name}
                </span>
              ) : (
                <span className="text-xs text-gray-400">Unassigned</span>
              )}
            </div>

            {/* Timeline Information */}
            {task.assignedTo && task.estimatedHours && (
              <div className="mt-2 ml-7">
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  {isScheduled ? (
                    <>
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Start: {taskScheduler.formatDate(estimatedStart)}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        End: {taskScheduler.formatDate(estimatedEnd)}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Scheduled
                      </span>
                    </>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Resource overloaded
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subtasks */}
      {isExpanded && hasSubtasks && (
        <div className="bg-gray-25">
          {task.subtasks?.map((subtask) => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              resources={resources}
              editingTask={editingTask}
              taskUpdates={taskUpdates}
              expandedTasks={expandedTasks}
              breakingIntoSubtasks={breakingIntoSubtasks}
              taskTimelines={taskTimelines}
              resourceSchedules={resourceSchedules}
              taskScheduler={taskScheduler}
              depth={depth + 1}
              onEdit={onEdit}
              onSave={onSave}
              onCancel={onCancel}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onBreakIntoSubtasks={onBreakIntoSubtasks}
              onToggleExpansion={onToggleExpansion}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectDetail() {
  const { data: session } = useSession()
  const router = useRouter()
  const { id } = router.query
  const [project, setProject] = useState<Project | null>(null)
  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)
  const [assignmentPreview, setAssignmentPreview] = useState<AssignmentPreview | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [taskUpdates, setTaskUpdates] = useState<Record<string, Partial<Task>>>({})
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAddTaskForm, setShowAddTaskForm] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    estimatedHours: '',
    priority: '50'
  })
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [breakingIntoSubtasks, setBreakingIntoSubtasks] = useState<Set<string>>(new Set())
  const [taskScheduler] = useState(() => new TaskScheduler())
  const [taskTimelines, setTaskTimelines] = useState<Map<string, any>>(new Map())
  const [resourceSchedules, setResourceSchedules] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    if (id) {
      fetchProjectAndResources()
    }
  }, [id])

  // Calculate schedules when project or resources change
  useEffect(() => {
    if (project && project.tasks.length > 0) {
      const { taskTimelines: newTaskTimelines, resourceSchedules: newResourceSchedules } =
        taskScheduler.calculateProjectSchedule(project.tasks as any)
      setTaskTimelines(newTaskTimelines)
      setResourceSchedules(newResourceSchedules)
    }
  }, [project, taskScheduler])

  const fetchProjectAndResources = async () => {
    try {
      const [projectResponse, resourcesResponse] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch('/api/resources')
      ])

      if (projectResponse.ok && resourcesResponse.ok) {
        const projectData = await projectResponse.json()
        const resourcesData = await resourcesResponse.json()
        setProject(projectData)
        setResources(resourcesData)
      } else {
        console.error('Failed to fetch project or resources')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      router.push('/dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateTasks = async () => {
    if (!project) return

    setIsGenerating(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/generate-tasks`, {
        method: 'POST'
      })

      if (response.ok) {
        // Refresh project data to show new tasks
        await fetchProjectAndResources()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to generate tasks')
      }
    } catch (error) {
      console.error('Error generating tasks:', error)
      alert('Failed to generate tasks')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePreviewAssignments = async () => {
    if (!project) return

    setIsGeneratingPreview(true)
    try {
      console.log('Generating assignment preview for project:', project.id)

      const response = await fetch(`/api/projects/${project.id}/preview-assignments`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Assignment preview generated:', result.preview)
        setAssignmentPreview(result.preview)
        setShowPreviewModal(true)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to generate assignment preview')
      }
    } catch (error) {
      console.error('Error generating assignment preview:', error)
      alert('Failed to generate assignment preview')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleApplyAssignments = async () => {
    if (!project) return

    setIsAssigning(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/assign-resources`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Assignment result:', result)

        // Close the preview modal
        setShowPreviewModal(false)
        setAssignmentPreview(null)

        // Refresh project data to show assignments
        await fetchProjectAndResources()

        // Show success message with scheduling info
        const { summary } = result
        let message = `Successfully assigned ${result.preview.assignments.length} tasks!`

        if (summary.immediate > 0) {
          message += `\n\n✅ ${summary.immediate} tasks scheduled for this week`
        }
        if (summary.deferred > 0) {
          message += `\n⏰ ${summary.deferred} tasks scheduled for later weeks`
        }
        if (summary.overflow > 0) {
          message += `\n⚠️ ${summary.overflow} tasks need bandwidth adjustment`
        }

        alert(message)
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to assign resources')
      }
    } catch (error) {
      console.error('Error assigning resources:', error)
      alert('Failed to assign resources')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/projects/${id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await fetchProjectAndResources()
        setEditingTask(null)
        setTaskUpdates(prev => {
          const newUpdates = { ...prev }
          delete newUpdates[taskId]
          return newUpdates
        })
        alert('Task updated successfully')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to update task')
      }
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task')
    }
  }

  const startEditing = (task: Task) => {
    setEditingTask(task.id)
    setTaskUpdates(prev => ({
      ...prev,
      [task.id]: {
        title: task.title,
        description: task.description || '',
        estimatedHours: task.estimatedHours || 0,
        priority: task.priority,
        status: task.status,
        assignedTo: task.assignedTo
      }
    }))
  }

  const cancelEditing = (taskId: string) => {
    setEditingTask(null)
    setTaskUpdates(prev => {
      const newUpdates = { ...prev }
      delete newUpdates[taskId]
      return newUpdates
    })
  }

  const updateTaskField = (taskId: string, field: keyof Task, value: any) => {
    setTaskUpdates(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [field]: value
      }
    }))
  }

  const handleExportCSV = async () => {
    if (!project) return

    setIsExporting(true)
    try {
      console.log('Starting CSV export for project:', project.id)

      const response = await fetch(`/api/projects/${project.id}/export/csv`)

      if (response.ok) {
        // Get the filename from the response headers
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv`

        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="([^"]*)"/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }

        // Create blob and download
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        console.log('CSV export completed successfully')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to export CSV')
      }
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!project) return

    if (!confirm(`Are you sure you want to delete the project "${project.title}"? This action cannot be undone and will also delete all tasks and assignments.`)) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Project deleted successfully')
        router.push('/dashboard')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to delete project')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      alert('Task title is required')
      return
    }

    setIsCreatingTask(true)

    try {
      const response = await fetch(`/api/projects/${id}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description || null,
          estimatedHours: newTask.estimatedHours ? parseInt(newTask.estimatedHours) : null,
          priority: parseInt(newTask.priority)
        }),
      })

      if (response.ok) {
        const result = await response.json()
        alert('Task created successfully')
        setNewTask({ title: '', description: '', estimatedHours: '', priority: '50' })
        setShowAddTaskForm(false)
        // Refresh project data
        await fetchProjectAndResources()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create task')
      }
    } catch (error) {
      console.error('Error creating task:', error)
      alert('Failed to create task')
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Are you sure you want to delete the task "${taskTitle}"? This action cannot be undone and will also delete all its subtasks.`)) {
      return
    }

    try {
      const response = await fetch(`/api/projects/${id}/tasks/${taskId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Task deleted successfully')
        // Refresh project data
        await fetchProjectAndResources()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to delete task')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Failed to delete task')
    }
  }

  const handleBreakIntoSubtasks = async (taskId: string, taskTitle: string) => {
    if (!confirm(`Break "${taskTitle}" into smaller subtasks using AI?`)) {
      return
    }

    setBreakingIntoSubtasks(prev => new Set(Array.from(prev).concat(taskId)))

    try {
      const response = await fetch(`/api/projects/${id}/tasks/${taskId}/break-into-subtasks`, {
        method: 'POST',
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully created ${result.subtasks.length} subtasks`)
        // Expand the parent task to show new subtasks
        setExpandedTasks(prev => new Set(Array.from(prev).concat(taskId)))
        // Refresh project data
        await fetchProjectAndResources()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to break task into subtasks')
      }
    } catch (error) {
      console.error('Error breaking task into subtasks:', error)
      alert('Failed to break task into subtasks')
    } finally {
      setBreakingIntoSubtasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Project not found</p>
          <Link href="/dashboard">
            <Button className="mt-4">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard">
                <h1 className="text-xl font-semibold text-gray-900 cursor-pointer">
                  AI Task Scheduler
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hello, {session?.user?.name}</span>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Project Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{project.title}</h2>
                <p className="mt-2 text-gray-600">{project.description}</p>
                <div className="mt-4 flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {project.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex space-x-3">
                {project.tasks.length === 0 && (
                  <Button
                    onClick={handleGenerateTasks}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Generating...' : 'Generate Tasks with AI'}
                  </Button>
                )}

                {project.tasks.length > 0 && resources.length > 0 && (
                  <Button
                    onClick={handlePreviewAssignments}
                    disabled={isGeneratingPreview || isAssigning}
                    variant="outline"
                  >
                    {isGeneratingPreview ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span>Analyzing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span>Smart Assign</span>
                      </div>
                    )}
                  </Button>
                )}

                {resources.length === 0 && project.tasks.length > 0 && (
                  <Link href="/resources">
                    <Button variant="outline">
                      Add Team Members
                    </Button>
                  </Link>
                )}

                {project.tasks.length > 0 && (
                  <Button
                    onClick={handleExportCSV}
                    disabled={isExporting}
                    variant="outline"
                  >
                    {isExporting ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span>Exporting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export CSV</span>
                      </div>
                    )}
                  </Button>
                )}

                <Button
                  onClick={handleDeleteProject}
                  disabled={isDeleting}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400"
                >
                  {isDeleting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      <span>Deleting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Project</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500">
                    {project.tasks.length} task{project.tasks.length !== 1 ? 's' : ''}
                  </span>
                  <Button
                    onClick={() => setShowAddTaskForm(true)}
                    size="sm"
                    variant="outline"
                  >
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Task</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            {/* Add Task Form */}
            {showAddTaskForm && (
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h4 className="text-md font-medium text-gray-900 mb-4">Add New Task</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Task Title *
                      </label>
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter task title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={newTask.estimatedHours}
                        onChange={(e) => setNewTask(prev => ({ ...prev, estimatedHours: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={newTask.description}
                      onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter task description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority (1-100)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newTask.priority}
                      onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 md:w-32"
                    />
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <Button
                      onClick={handleCreateTask}
                      disabled={isCreatingTask || !newTask.title.trim()}
                      size="sm"
                    >
                      {isCreatingTask ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Creating...</span>
                        </div>
                      ) : (
                        'Create Task'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddTaskForm(false)
                        setNewTask({ title: '', description: '', estimatedHours: '', priority: '50' })
                      }}
                      size="sm"
                      disabled={isCreatingTask}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {project.tasks.length === 0 ? (
              <div className="p-6 text-center">
                <div className="max-w-sm mx-auto">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h4 className="mt-4 text-sm font-medium text-gray-900">No tasks yet</h4>
                  <p className="mt-2 text-sm text-gray-500">
                    Use AI to generate tasks from your project description or add them manually.
                  </p>
                  <div className="mt-4 flex space-x-3">
                    <Button
                      onClick={handleGenerateTasks}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Generating...' : 'Generate Tasks with AI'}
                    </Button>
                    <Button
                      onClick={() => setShowAddTaskForm(true)}
                      variant="outline"
                    >
                      Add Task Manually
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {project.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    resources={resources}
                    editingTask={editingTask}
                    taskUpdates={taskUpdates}
                    expandedTasks={expandedTasks}
                    breakingIntoSubtasks={breakingIntoSubtasks}
                    taskTimelines={taskTimelines}
                    resourceSchedules={resourceSchedules}
                    taskScheduler={taskScheduler}
                    onEdit={startEditing}
                    onSave={handleTaskUpdate}
                    onCancel={cancelEditing}
                    onUpdate={updateTaskField}
                    onDelete={handleDeleteTask}
                    onBreakIntoSubtasks={handleBreakIntoSubtasks}
                    onToggleExpansion={toggleTaskExpansion}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Assignment Preview Modal */}
      <AssignmentPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        preview={assignmentPreview}
        onApplyAssignments={handleApplyAssignments}
        isApplying={isAssigning}
      />
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions)

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    }
  }

  return {
    props: {},
  }
}