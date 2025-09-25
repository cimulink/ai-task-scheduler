import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    return handleCreateTask(req, res)
  } else {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }
}

async function handleCreateTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { id: projectId } = req.query
    if (typeof projectId !== 'string') {
      return res.status(400).json({ message: 'Invalid project ID' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Verify project belongs to user
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: user.id
      }
    })

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    const { title, description, estimatedHours, priority, status = 'pending' } = req.body

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' })
    }

    console.log(`[API] Creating new task for project: ${projectId}`)

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        estimatedHours: estimatedHours || null,
        priority: priority || 50,
        status,
        projectId,
        assignedTo: null
      },
      include: {
        assignee: true
      }
    })

    console.log(`[API] Task created successfully: ${task.id}`)

    res.status(201).json({
      message: 'Task created successfully',
      task
    })

  } catch (error) {
    console.error('[API] Error creating task:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}