import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { TaskScheduler } from '@/lib/scheduling/taskScheduler'

interface Task {
  id: string
  title: string
  description: string | null
  estimatedHours: number | null
  priority: number
  status: string
  project: {
    id: string
    title: string
    status: string
  }
}

interface Resource {
  id: string
  name: string
  role: string
  weeklyHours: number
  skills: string[]
  createdAt: string
  assignedTasks: Task[]
  totalAssignedHours: number
  remainingHours: number
  utilizationPercentage: number
}

interface Project {
  id: string
  title: string
  status: string
  tasks: TaskWithSchedule[]
}

interface TaskWithSchedule {
  id: string
  title: string
  estimatedHours: number | null
  priority: number
  status: string
  assignedTo: string | null
  assignee?: {
    id: string
    name: string
    weeklyHours: number
  } | null
  parentTaskId?: string | null
  subtasks?: TaskWithSchedule[]
}

const ROLES = [
  'Designer',
  'Developer',
  'Manager',
  'Copywriter',
  'Other'
]

export default function Resources() {
  const { data: session } = useSession()
  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    role: 'Developer',
    weeklyHours: 40,
    skills: ''
  })

  // Scheduling state
  const [taskScheduler] = useState(() => new TaskScheduler())
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [resourceSchedules, setResourceSchedules] = useState<Map<string, any>>(new Map())
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false)

  useEffect(() => {
    fetchResources()
    fetchAllProjects()
  }, [])

  useEffect(() => {
    if (allProjects.length > 0) {
      calculateResourceSchedules()
    }
  }, [allProjects, taskScheduler])

  const fetchResources = async () => {
    try {
      const response = await fetch('/api/resources')
      if (response.ok) {
        const resourcesData = await response.json()
        setResources(resourcesData)
      } else {
        console.error('Failed to fetch resources')
      }
    } catch (error) {
      console.error('Error fetching resources:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllProjects = async () => {
    setIsLoadingSchedules(true)
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const projectsData = await response.json()
        setAllProjects(projectsData)
      } else {
        console.error('Failed to fetch projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setIsLoadingSchedules(false)
    }
  }

  const calculateResourceSchedules = () => {
    if (allProjects.length === 0) return

    // Combine all tasks from all projects
    const allTasks: TaskWithSchedule[] = []
    allProjects.forEach(project => {
      if (project.tasks) {
        allTasks.push(...project.tasks)
      }
    })

    if (allTasks.length === 0) return

    const { resourceSchedules: newResourceSchedules } = taskScheduler.calculateProjectSchedule(allTasks)
    setResourceSchedules(newResourceSchedules)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const skillsArray = formData.skills
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0)

      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          skills: skillsArray
        }),
      })

      if (response.ok) {
        await fetchResources()
        setShowForm(false)
        setFormData({
          name: '',
          role: 'Developer',
          weeklyHours: 40,
          skills: ''
        })
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to create resource')
      }
    } catch (error) {
      console.error('Error creating resource:', error)
      alert('Failed to create resource')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return
    }

    try {
      const response = await fetch(`/api/resources/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchResources()
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to delete resource')
      }
    } catch (error) {
      console.error('Error deleting resource:', error)
      alert('Failed to delete resource')
    }
  }

  const openResourceDetails = (resource: Resource) => {
    setSelectedResource(resource)
    setShowDetailsModal(true)
  }

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-600 bg-red-50'
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading resources...</p>
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
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Team Resources</h2>
              <p className="mt-2 text-gray-600">
                Manage your team members, their roles, and availability for project assignments.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)}>
              Add Team Member
            </Button>
          </div>

          {/* Add Resource Form */}
          {showForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Team Member</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter team member name"
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <select
                      id="role"
                      name="role"
                      required
                      value={formData.role}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {ROLES.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="weeklyHours" className="block text-sm font-medium text-gray-700 mb-2">
                      Weekly Hours *
                    </label>
                    <Input
                      id="weeklyHours"
                      name="weeklyHours"
                      type="number"
                      required
                      min="1"
                      max="60"
                      value={formData.weeklyHours}
                      onChange={handleInputChange}
                      placeholder="40"
                    />
                  </div>

                  <div>
                    <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-2">
                      Skills (comma separated)
                    </label>
                    <Input
                      id="skills"
                      name="skills"
                      type="text"
                      value={formData.skills}
                      onChange={handleInputChange}
                      placeholder="React, TypeScript, Node.js"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim()}
                  >
                    {isSubmitting ? 'Adding...' : 'Add Team Member'}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Resources List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Team Members ({resources.length})
              </h3>
            </div>

            {resources.length === 0 ? (
              <div className="p-6 text-center">
                <div className="max-w-sm mx-auto">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <h4 className="mt-4 text-sm font-medium text-gray-900">No team members yet</h4>
                  <p className="mt-2 text-sm text-gray-500">
                    Add your first team member to start assigning tasks and managing workloads.
                  </p>
                  <Button
                    onClick={() => setShowForm(true)}
                    className="mt-4"
                  >
                    Add Team Member
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {resources.map((resource) => (
                  <div key={resource.id} className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="text-lg font-medium text-gray-900">{resource.name}</h4>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {resource.role}
                          </span>
                        </div>

                        {/* Bandwidth Information */}
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Capacity: {resource.weeklyHours}h/week</span>
                            <span>Assigned: {resource.totalAssignedHours}h</span>
                            <span>Remaining: {resource.remainingHours}h</span>
                            <span>Added {new Date(resource.createdAt).toLocaleDateString()}</span>
                          </div>

                          {/* Utilization Bar */}
                          <div className="flex items-center space-x-3">
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    resource.utilizationPercentage >= 100 ? 'bg-red-500' :
                                    resource.utilizationPercentage >= 80 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(resource.utilizationPercentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getUtilizationColor(resource.utilizationPercentage)}`}>
                              {resource.utilizationPercentage}%
                            </span>
                          </div>
                        </div>

                        {/* Assigned Tasks Summary */}
                        {resource.assignedTasks.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Assigned Tasks ({resource.assignedTasks.length})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {resource.assignedTasks.slice(0, 3).map((task) => (
                                <div key={task.id} className="flex items-center space-x-1">
                                  <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                    {task.title.length > 20 ? `${task.title.substring(0, 20)}...` : task.title}
                                  </span>
                                  <span className={`text-xs px-1 py-0.5 rounded ${getStatusColor(task.status)}`}>
                                    {task.status}
                                  </span>
                                </div>
                              ))}
                              {resource.assignedTasks.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{resource.assignedTasks.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Weekly Schedule */}
                        {resourceSchedules.has(resource.id) && (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-medium text-gray-700">Weekly Schedule</h5>
                              {isLoadingSchedules && (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                              )}
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {resourceSchedules.get(resource.id)?.weeks
                                  ?.filter((week: any) => week.assignedHours > 0)
                                  .slice(0, 4) // Show first 4 weeks with assignments
                                  .map((week: any) => (
                                  <div key={week.weekNumber} className="bg-white rounded border p-2">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs font-medium text-gray-900">
                                        Week {week.weekNumber}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {week.assignedHours}h
                                      </span>
                                    </div>
                                    {/* Mini workload bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
                                      <div
                                        className={`h-1 rounded-full ${
                                          week.assignedHours > resource.weeklyHours
                                            ? 'bg-red-500'
                                            : week.assignedHours > resource.weeklyHours * 0.8
                                            ? 'bg-yellow-500'
                                            : 'bg-green-500'
                                        }`}
                                        style={{
                                          width: `${Math.min(
                                            (week.assignedHours / resource.weeklyHours) * 100,
                                            100
                                          )}%`
                                        }}
                                      ></div>
                                    </div>
                                    {/* Tasks for this week */}
                                    <div className="space-y-1">
                                      {week.tasks.slice(0, 2).map((task: any) => (
                                        <div key={task.taskId} className="text-xs text-gray-600">
                                          <div className="truncate">
                                            {task.title.length > 15 ? `${task.title.substring(0, 15)}...` : task.title}
                                          </div>
                                        </div>
                                      ))}
                                      {week.tasks.length > 2 && (
                                        <div className="text-xs text-gray-400">
                                          +{week.tasks.length - 2} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {resourceSchedules.get(resource.id)?.weeks?.filter((week: any) => week.assignedHours > 0).length === 0 && (
                                <div className="text-center py-4 text-xs text-gray-500">
                                  No tasks scheduled
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        {resource.skills.length > 0 && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-2">
                              {resource.skills.map((skill, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openResourceDetails(resource)}
                          disabled={resource.assignedTasks.length === 0}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteResource(resource.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Resource Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={selectedResource ? `${selectedResource.name} - Task Details` : 'Task Details'}
      >
        {selectedResource && (
          <div className="space-y-4">
            {/* Resource Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Role:</span>
                  <p className="text-sm text-gray-900">{selectedResource.role}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Weekly Capacity:</span>
                  <p className="text-sm text-gray-900">{selectedResource.weeklyHours}h</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Assigned Hours:</span>
                  <p className="text-sm text-gray-900">{selectedResource.totalAssignedHours}h</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Remaining Hours:</span>
                  <p className={`text-sm font-medium ${
                    selectedResource.remainingHours <= 0 ? 'text-red-600' :
                    selectedResource.remainingHours < 10 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {selectedResource.remainingHours}h
                  </p>
                </div>
              </div>

              {/* Utilization */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Utilization</span>
                  <span className={`text-sm px-2 py-1 rounded-full font-medium ${getUtilizationColor(selectedResource.utilizationPercentage)}`}>
                    {selectedResource.utilizationPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      selectedResource.utilizationPercentage >= 100 ? 'bg-red-500' :
                      selectedResource.utilizationPercentage >= 80 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(selectedResource.utilizationPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Task Details */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">
                Assigned Tasks ({selectedResource.assignedTasks.length})
              </h4>

              {selectedResource.assignedTasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No active tasks assigned
                </p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {selectedResource.assignedTasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900 mb-1">
                            {task.title}
                          </h5>

                          {task.description && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <span>Project: {task.project.title}</span>
                            {task.estimatedHours && (
                              <span>Est: {task.estimatedHours}h</span>
                            )}
                            <span>Priority: {task.priority}/100</span>
                          </div>
                        </div>

                        <div className="ml-3 flex flex-col items-end space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            task.project.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                            task.project.status === 'completed' ? 'bg-green-50 text-green-700' :
                            'bg-gray-50 text-gray-700'
                          }`}>
                            {task.project.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills */}
            {selectedResource.skills.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedResource.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
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