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

    const { id } = req.query
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid project ID' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    console.log(`[API] Exporting CSV for project: ${id}`)

    // Get project with full task and resource data
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.id
      },
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
        }
      }
    })

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    // Get all resources for this user
    const resources = await prisma.resource.findMany({
      where: { userId: user.id },
      include: {
        tasks: {
          where: {
            projectId: project.id,
            status: {
              in: ['pending', 'in_progress']
            }
          },
          select: {
            estimatedHours: true
          }
        }
      }
    })

    console.log(`[API] Found ${project.tasks.length} tasks and ${resources.length} resources`)

    // Generate CSV content
    const csvData = generateProjectCSV(project, resources)

    // Set headers for file download
    const fileName = `${project.title.replace(/[^a-zA-Z0-9]/g, '_')}_export_${new Date().toISOString().split('T')[0]}.csv`

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Cache-Control', 'no-cache')

    console.log(`[API] CSV export completed: ${fileName}`)

    res.status(200).send(csvData)

  } catch (error) {
    console.error('[API] Error during CSV export:', error)
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message)
      console.error('[API] Error stack:', error.stack)
    }
    res.status(500).json({ message: 'Internal server error' })
  }
}

function generateProjectCSV(project: any, resources: any[]): string {
  const lines: string[] = []

  // Project Information Header
  lines.push('PROJECT INFORMATION')
  lines.push('Field,Value')
  lines.push(`"Title","${escapeCSV(project.title)}"`)
  lines.push(`"Description","${escapeCSV(project.description || '')}"`)
  lines.push(`"Status","${project.status}"`)
  lines.push(`"Created","${new Date(project.createdAt).toLocaleDateString()}"`)
  lines.push(`"Last Updated","${new Date(project.updatedAt).toLocaleDateString()}"`)
  lines.push(`"Total Tasks","${project.tasks.length}"`)

  // Calculate project totals
  const totalEstimatedHours = project.tasks.reduce((sum: number, task: any) =>
    sum + (task.estimatedHours || 0), 0
  )
  const completedTasks = project.tasks.filter((task: any) => task.status === 'completed').length
  const assignedTasks = project.tasks.filter((task: any) => task.assignedTo).length

  lines.push(`"Total Estimated Hours","${totalEstimatedHours}"`)
  lines.push(`"Completed Tasks","${completedTasks}"`)
  lines.push(`"Assigned Tasks","${assignedTasks}"`)
  lines.push('')

  // Tasks Section
  lines.push('TASKS')
  lines.push('Task ID,Title,Description,Status,Priority,Estimated Hours,Assigned To,Assignee Role,Created Date')

  project.tasks.forEach((task: any) => {
    lines.push([
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

  lines.push('')

  // Resources Section
  lines.push('TEAM RESOURCES')
  lines.push('Resource ID,Name,Role,Weekly Hours,Current Project Hours,Remaining Hours,Utilization %,Skills')

  resources.forEach((resource: any) => {
    const projectHours = resource.tasks.reduce((sum: number, task: any) =>
      sum + (task.estimatedHours || 0), 0
    )
    const remainingHours = Math.max(0, resource.weeklyHours - projectHours)
    const utilization = Math.round((projectHours / resource.weeklyHours) * 100)

    lines.push([
      `"${resource.id}"`,
      `"${escapeCSV(resource.name)}"`,
      `"${resource.role}"`,
      `"${resource.weeklyHours}"`,
      `"${projectHours}"`,
      `"${remainingHours}"`,
      `"${utilization}%"`,
      `"${resource.skills.join(', ')}"`
    ].join(','))
  })

  lines.push('')

  // Task Assignment Summary
  lines.push('ASSIGNMENT SUMMARY')
  lines.push('Resource Name,Role,Assigned Tasks,Total Hours,Task List')

  const assignmentSummary = new Map()

  project.tasks.forEach((task: any) => {
    if (task.assignee) {
      const key = task.assignee.name
      if (!assignmentSummary.has(key)) {
        assignmentSummary.set(key, {
          name: task.assignee.name,
          role: task.assignee.role,
          tasks: [],
          totalHours: 0
        })
      }
      const summary = assignmentSummary.get(key)
      summary.tasks.push(task.title)
      summary.totalHours += (task.estimatedHours || 0)
    }
  })

  Array.from(assignmentSummary.values()).forEach((summary: any) => {
    lines.push([
      `"${escapeCSV(summary.name)}"`,
      `"${summary.role}"`,
      `"${summary.tasks.length}"`,
      `"${summary.totalHours}"`,
      `"${escapeCSV(summary.tasks.join('; '))}"`
    ].join(','))
  })

  lines.push('')

  // Export Metadata
  lines.push('EXPORT INFORMATION')
  lines.push('Field,Value')
  lines.push(`"Export Date","${new Date().toLocaleDateString()}"`)
  lines.push(`"Export Time","${new Date().toLocaleTimeString()}"`)
  lines.push(`"Exported By","${escapeCSV(project.user?.name || 'Unknown User')}"`)

  return lines.join('\n')
}

function escapeCSV(str: string): string {
  if (str == null) return ''
  // Escape quotes by doubling them and wrap in quotes if needed
  const escaped = str.replace(/"/g, '""')
  return escaped
}