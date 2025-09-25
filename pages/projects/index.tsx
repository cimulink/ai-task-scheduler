import { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import { getServerSession } from 'next-auth'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { Button } from '@/components/ui/Button'

interface Project {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
  updatedAt: string
  _count: {
    tasks: number
  }
}

export default function Projects() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const projectsData = await response.json()
        setProjects(projectsData)
      } else {
        console.error('Failed to fetch projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleExportAllCSV = async () => {
    setIsExporting(true)
    try {
      console.log('Starting export of all projects')

      const response = await fetch('/api/projects/export/all-csv')

      if (response.ok) {
        // Get the filename from the response headers
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = `All_Projects_Export_${new Date().toISOString().split('T')[0]}.csv`

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

        console.log('All projects CSV export completed successfully')
      } else {
        const error = await response.json()
        alert(error.message || 'Failed to export CSV')
      }
    } catch (error) {
      console.error('Error exporting all projects CSV:', error)
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
          <p className="mt-4 text-gray-600">Loading projects...</p>
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
              <h2 className="text-2xl font-bold text-gray-900">All Projects</h2>
              <p className="mt-2 text-gray-600">
                Manage your projects and track their progress.
              </p>
            </div>
            <div className="flex space-x-3">
              {projects.length > 0 && (
                <Button
                  onClick={handleExportAllCSV}
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
                      <span>Export All</span>
                    </div>
                  )}
                </Button>
              )}
              <Link href="/projects/new">
                <Button>Create New Project</Button>
              </Link>
            </div>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <div className="max-w-sm mx-auto">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="mt-4 text-sm font-medium text-gray-900">No projects yet</h4>
                <p className="mt-2 text-sm text-gray-500">
                  Get started by creating your first project with AI-powered task generation.
                </p>
                <Link href="/projects/new">
                  <Button className="mt-4">
                    Create Your First Project
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200 cursor-pointer">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {project._count.tasks} task{project._count.tasks !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-1">
                        {project.title}
                      </h3>

                      {project.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created {formatDate(project.createdAt)}</span>
                        <span>Updated {formatDate(project.updatedAt)}</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 px-6 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-600">
                          View Details →
                        </span>
                        <div className="flex items-center space-x-2">
                          {project.status === 'draft' && (
                            <span className="text-xs text-gray-500">Ready for tasks</span>
                          )}
                          {project.status === 'in_progress' && (
                            <span className="text-xs text-gray-500">Active</span>
                          )}
                          {project.status === 'completed' && (
                            <span className="text-xs text-gray-500">Completed</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
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