import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    console.log(`[API] Exporting all projects CSV for user: ${user.id}`)

    // Get all projects with tasks and resources
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        tasks: {
          include: {
            assignee: {
              select: {
                name: true,
                role: true,
                weeklyHours: true,
                skills: true
              }
            }
          },
          orderBy: { priority: 'desc' }
        },
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Get all resources
    const resources = await prisma.resource.findMany({
      where: { userId: user.id },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            estimatedHours: true,
            projectId: true,
            project: {
              select: {
                title: true
              }
            }
          }
        }
      }
    })

    console.log(`[API] Found ${projects.length} projects and ${resources.length} resources`)

    // Generate CSV content
    const csvData = generateAllProjectsCSV(projects, resources, user)

    // Set headers for file download
    const fileName = `All_Projects_Export_${new Date().toISOString().split('T')[0]}.csv`

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Cache-Control', 'no-cache')

    console.log(`[API] All projects CSV export completed: ${fileName}`)

    res.status(200).send(csvData)

  } catch (error) {
    console.error('[API] Error during all projects CSV export:', error)
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message)
      console.error('[API] Error stack:', error.stack)
    }
    res.status(500).json({ message: 'Internal server error' })
  }
}

function generateAllProjectsCSV(projects: any[], resources: any[], user: any): string {
  const lines: string[] = []

  // User Information Header
  lines.push('USER DASHBOARD EXPORT')
  lines.push('Field,Value')
  lines.push(`"User Name","${escapeCSV(user.name)}"`)
  lines.push(`"Company","${escapeCSV(user.company || '')}"`)
  lines.push(`"Export Date","${new Date().toLocaleDateString()}"`)
  lines.push(`"Total Projects","${projects.length}"`)
  lines.push(`"Total Resources","${resources.length}"`)

  const totalTasks = projects.reduce((sum, project) => sum + project._count.tasks, 0)
  lines.push(`"Total Tasks","${totalTasks}"`)
  lines.push('')

  // Projects Overview
  lines.push('PROJECTS OVERVIEW')
  lines.push('Project ID,Title,Description,Status,Created Date,Last Updated,Task Count,Total Hours,Completed Tasks,Assigned Tasks')

  projects.forEach((project: any) => {
    const totalHours = project.tasks.reduce((sum: number, task: any) => sum + (task.estimatedHours || 0), 0)
    const completedTasks = project.tasks.filter((task: any) => task.status === 'completed').length
    const assignedTasks = project.tasks.filter((task: any) => task.assignedTo).length

    lines.push([
      `"${project.id}"`,
      `"${escapeCSV(project.title)}"`,
      `"${escapeCSV(project.description || '')}"`,
      `"${project.status}"`,
      `"${new Date(project.createdAt).toLocaleDateString()}"`,
      `"${new Date(project.updatedAt).toLocaleDateString()}"`,
      `"${project._count.tasks}"`,
      `"${totalHours}"`,
      `"${completedTasks}"`,
      `"${assignedTasks}"`
    ].join(','))
  })

  lines.push('')

  // All Tasks Details
  lines.push('ALL TASKS DETAILS')
  lines.push('Project,Task ID,Title,Description,Status,Priority,Estimated Hours,Assigned To,Assignee Role,Created Date')

  projects.forEach((project: any) => {
    project.tasks.forEach((task: any) => {
      lines.push([
        `"${escapeCSV(project.title)}"`,
        `"${task.id}"`,
        `"${escapeCSV(task.title)}"`,
        `"${escapeCSV(task.description || '')}"`,
        `"${task.status}"`,
        `"${task.priority}"`,
        `"${task.estimatedHours || 0}"`,
        `"${escapeCSV(task.assignee?.name || 'Unassigned')}"`,
        `"${escapeCSV(task.assignee?.role || '')}"`,
        `"${new Date(task.createdAt).toLocaleDateString()}"`
      ].join(','))
    })
  })

  lines.push('')

  // Resources Summary
  lines.push('RESOURCES SUMMARY')
  lines.push('Resource ID,Name,Role,Weekly Hours,Total Assigned Hours,Utilization %,Active Projects,Skills')

  resources.forEach((resource: any) => {
    const totalAssignedHours = resource.tasks.reduce((sum: number, task: any) => sum + (task.estimatedHours || 0), 0)
    const utilization = Math.round((totalAssignedHours / resource.weeklyHours) * 100)
    const activeProjects = [...new Set(resource.tasks.map((task: any) => task.project.title))].join('; ')

    lines.push([
      `"${resource.id}"`,
      `"${escapeCSV(resource.name)}"`,
      `"${resource.role}"`,
      `"${resource.weeklyHours}"`,
      `"${totalAssignedHours}"`,
      `"${utilization}%"`,
      `"${escapeCSV(activeProjects)}"`,
      `"${resource.skills.join(', ')}"`
    ].join(','))
  })

  lines.push('')

  // Resource Task Assignments
  lines.push('RESOURCE TASK ASSIGNMENTS')
  lines.push('Resource Name,Role,Project,Task,Estimated Hours,Status')

  resources.forEach((resource: any) => {
    resource.tasks.forEach((task: any) => {
      lines.push([
        `"${escapeCSV(resource.name)}"`,
        `"${resource.role}"`,
        `"${escapeCSV(task.project.title)}"`,
        `"${escapeCSV(task.title)}"`,
        `"${task.estimatedHours || 0}"`,
        `"${task.status || 'pending'}"`
      ].join(','))
    })
  })

  return lines.join('\n')
}

function escapeCSV(str: string): string {
  if (str == null) return ''
  // Escape quotes by doubling them and wrap in quotes if needed
  const escaped = str.replace(/"/g, '""')
  return escaped
}