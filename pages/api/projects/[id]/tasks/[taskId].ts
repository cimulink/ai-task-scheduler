import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'PUT') {
    return handleUpdateTask(req, res)
  } else if (req.method === 'DELETE') {
    return handleDeleteTask(req, res)
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE'])
    return res.status(405).json({ message: 'Method not allowed' })
  }
}

async function handleUpdateTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { id: projectId, taskId } = req.query
    if (typeof projectId !== 'string' || typeof taskId !== 'string') {
      return res.status(400).json({ message: 'Invalid project or task ID' })
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

    // Verify task belongs to the project
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId: projectId
      }
    })

    if (!existingTask) {
      return res.status(404).json({ message: 'Task not found' })
    }

    const { title, description, estimatedHours, priority, status, assignedTo } = req.body

    console.log(`[API] Updating task: ${taskId}`)

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(estimatedHours !== undefined && { estimatedHours }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(assignedTo !== undefined && { assignedTo })
      },
      include: {
        assignee: true
      }
    })

    console.log(`[API] Task updated successfully: ${taskId}`)

    res.status(200).json({
      message: 'Task updated successfully',
      task: updatedTask
    })

  } catch (error) {
    console.error('[API] Error updating task:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleDeleteTask(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { id: projectId, taskId } = req.query
    if (typeof projectId !== 'string' || typeof taskId !== 'string') {
      return res.status(400).json({ message: 'Invalid project or task ID' })
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

    // Verify task belongs to the project and delete it
    const deletedTask = await prisma.task.deleteMany({
      where: {
        id: taskId,
        projectId: projectId
      }
    })

    if (deletedTask.count === 0) {
      return res.status(404).json({ message: 'Task not found' })
    }

    console.log(`[API] Task deleted successfully: ${taskId}`)

    res.status(200).json({
      message: 'Task deleted successfully'
    })

  } catch (error) {
    console.error('[API] Error deleting task:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}