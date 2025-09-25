import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { useSession, signOut } from 'next-auth/react'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

interface Project {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
  _count: {
    tasks: number
  }
}

export default function Dashboard() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalTasks: 0,
    teamMembers: 0
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [projectsResponse, resourcesResponse] = await Promise.all([
        fetch('/api/projects'),
        fetch('/api/resources')
      ])

      if (projectsResponse.ok && resourcesResponse.ok) {
        const projectsData = await projectsResponse.json()
        const resourcesData = await resourcesResponse.json()

        setProjects(projectsData.slice(0, 3)) // Show only recent 3 projects

        setStats({
          activeProjects: projectsData.filter((p: Project) => p.status !== 'completed').length,
          totalTasks: projectsData.reduce((acc: number, p: Project) => acc + p._count.tasks, 0),
          teamMembers: resourcesData.length
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                AI Task Scheduler
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Hello, {session?.user?.name}</span>
              <button
                onClick={() => signOut()}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <div className="col-span-1 md:col-span-2">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Quick Actions
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link
                      href="/projects/new"
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">+</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">New Project</h4>
                        <p className="text-sm text-gray-500">Create a new project with AI task generation</p>
                      </div>
                    </Link>

                    <Link
                      href="/resources"
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200"
                    >
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-900">Manage Resources</h4>
                        <p className="text-sm text-gray-500">Add and manage team members</p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="col-span-1">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Overview
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Active Projects</span>
                      <span className="text-sm font-medium text-gray-900">
                        {isLoading ? '...' : stats.activeProjects}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Tasks</span>
                      <span className="text-sm font-medium text-gray-900">
                        {isLoading ? '...' : stats.totalTasks}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Team Members</span>
                      <span className="text-sm font-medium text-gray-900">
                        {isLoading ? '...' : stats.teamMembers}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Projects */}
          <div className="mt-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Recent Projects
                  </h3>
                  <Link
                    href="/projects"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    View all →
                  </Link>
                </div>

                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Loading projects...</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No projects yet. Create your first project to get started!</p>
                    <Link
                      href="/projects/new"
                      className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                    >
                      Create Project
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition duration-200 cursor-pointer">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="text-sm font-medium text-gray-900">{project.title}</h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                project.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                                project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {project.status.replace('_', ' ')}
                              </span>
                            </div>
                            {project.description && (
                              <p className="mt-1 text-sm text-gray-600 line-clamp-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{project._count.tasks} tasks</span>
                            <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
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