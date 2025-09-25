import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { Button } from '@/components/ui/Button'

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
  assignee?: Resource | null
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
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [taskUpdates, setTaskUpdates] = useState<Record<string, Partial<Task>>>({})

  useEffect(() => {
    if (id) {
      fetchProjectAndResources()
    }
  }, [id])

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

  const handleAssignResources = async () => {
    if (!project) return

    setIsAssigning(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/assign-resources`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Assignment result:', result)
        // Refresh project data to show assignments
        await fetchProjectAndResources()
        alert(`Successfully assigned ${result.assignments.length} tasks to team members`)
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
      const response = await fetch(`/api/tasks/${taskId}`, {
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
                    onClick={handleAssignResources}
                    disabled={isAssigning}
                    variant="outline"
                  >
                    {isAssigning ? 'Assigning...' : 'Auto-Assign Resources'}
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
              </div>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
                <span className="text-sm text-gray-500">
                  {project.tasks.length} task{project.tasks.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

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
                  <Button
                    onClick={handleGenerateTasks}
                    disabled={isGenerating}
                    className="mt-4"
                  >
                    {isGenerating ? 'Generating...' : 'Generate Tasks with AI'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {project.tasks.map((task) => (
                  <div key={task.id} className="p-6">
                    {editingTask === task.id ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={taskUpdates[task.id]?.title || ''}
                            onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={taskUpdates[task.id]?.description || ''}
                            onChange={(e) => updateTaskField(task.id, 'description', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.5"
                              value={taskUpdates[task.id]?.estimatedHours || 0}
                              onChange={(e) => updateTaskField(task.id, 'estimatedHours', parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority (1-100)</label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={taskUpdates[task.id]?.priority || 50}
                              onChange={(e) => updateTaskField(task.id, 'priority', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                              value={taskUpdates[task.id]?.status || 'pending'}
                              onChange={(e) => updateTaskField(task.id, 'status', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                          <select
                            value={taskUpdates[task.id]?.assignedTo || ''}
                            onChange={(e) => updateTaskField(task.id, 'assignedTo', e.target.value || null)}
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

                        <div className="flex space-x-3 pt-2">
                          <Button
                            onClick={() => handleTaskUpdate(task.id, taskUpdates[task.id] || {})}
                            size="sm"
                          >
                            Save Changes
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => cancelEditing(task.id)}
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEditing(task)}
                            >
                              Edit
                            </Button>
                          </div>

                          {task.description && (
                            <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                          )}

                          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                            {task.estimatedHours && (
                              <span>Est: {task.estimatedHours}h</span>
                            )}
                            <span>Priority: {task.priority}/100</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {task.status.replace('_', ' ')}
                            </span>
                          </div>

                          {task.assignedTo ? (
                            task.assignee ? (
                              <div className="mt-2 flex items-center space-x-2">
                                <span className="text-xs text-gray-500">Assigned to:</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                  {task.assignee.name} ({task.assignee.role})
                                </span>
                              </div>
                            ) : (
                              <div className="mt-2 flex items-center space-x-2">
                                <span className="text-xs text-gray-500">Assigned to:</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700">
                                  Resource ID: {task.assignedTo}
                                </span>
                              </div>
                            )
                          ) : (
                            <div className="mt-2 flex items-center space-x-2">
                              <span className="text-xs text-gray-400">Unassigned</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
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