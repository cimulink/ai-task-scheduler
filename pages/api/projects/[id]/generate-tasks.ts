import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAIService } from '@/lib/ai/aiService'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
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

    // Get project
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    })

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    // Check if tasks already exist
    const existingTasks = await prisma.task.findMany({
      where: { projectId: project.id }
    })

    if (existingTasks.length > 0) {
      return res.status(400).json({ message: 'Tasks already exist for this project' })
    }

    // Generate tasks using configurable AI service
    console.log(`[API] Starting task generation for project: ${project.id}`)
    console.log(`[API] Project: "${project.title}"`)
    console.log(`[API] Description length: ${(project.description || '').length} characters`)

    const aiService = getAIService()
    const startTime = Date.now()

    console.log('[API] Calling AI service for task generation...')
    const generatedTasks = await aiService.generateTasks(project.description || project.title)

    const duration = Date.now() - startTime
    console.log(`[API] AI service completed in ${duration}ms`)
    console.log(`[API] Generated ${generatedTasks.length} tasks`)

    // Save generated tasks to database
    console.log('[API] Saving generated tasks to database...')
    const dbStartTime = Date.now()

    const createdTasks = await Promise.all(
      generatedTasks.map((task, index) => {
        console.log(`[API] Creating task ${index + 1}: "${task.title}" (${task.estimatedHours}h, priority: ${task.priority})`)
        return prisma.task.create({
          data: {
            projectId: project.id,
            title: task.title,
            description: task.description,
            estimatedHours: task.estimatedHours,
            priority: task.priority,
            status: 'pending'
          }
        })
      })
    )

    const dbDuration = Date.now() - dbStartTime
    console.log(`[API] Database operations completed in ${dbDuration}ms`)

    // Update project status to in_progress
    console.log('[API] Updating project status to in_progress...')
    await prisma.project.update({
      where: { id: project.id },
      data: { status: 'in_progress' }
    })

    console.log('[API] Task generation process completed successfully')

    res.status(200).json({
      message: 'Tasks generated successfully',
      tasks: createdTasks
    })
  } catch (error) {
    console.error('[API] Error during task generation:', error)
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message)
      console.error('[API] Error stack:', error.stack)
    }
    res.status(500).json({ message: 'Internal server error' })
  }
}