import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateResourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  role: z.string().min(1, 'Role is required').max(100, 'Role too long').optional(),
  weeklyHours: z.number().min(1, 'Weekly hours must be at least 1').max(60, 'Weekly hours cannot exceed 60').optional(),
  skills: z.array(z.string()).optional()
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetResource(req, res)
  } else if (req.method === 'PUT') {
    return handleUpdateResource(req, res)
  } else if (req.method === 'DELETE') {
    return handleDeleteResource(req, res)
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({ message: 'Method not allowed' })
  }
}

async function handleGetResource(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { id } = req.query
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid resource ID' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const resource = await prisma.resource.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    })

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' })
    }

    res.status(200).json(resource)
  } catch (error) {
    console.error('Error fetching resource:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleUpdateResource(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { id } = req.query
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid resource ID' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    const validatedData = updateResourceSchema.parse(req.body)

    const resource = await prisma.resource.updateMany({
      where: {
        id: id,
        userId: user.id
      },
      data: validatedData
    })

    if (resource.count === 0) {
      return res.status(404).json({ message: 'Resource not found' })
    }

    // Fetch updated resource
    const updatedResource = await prisma.resource.findFirst({
      where: {
        id: id,
        userId: user.id
      }
    })

    res.status(200).json(updatedResource)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      })
    }
    console.error('Error updating resource:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleDeleteResource(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    if (!session?.user?.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const { id } = req.query
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid resource ID' })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // First, unassign any tasks assigned to this resource
    await prisma.task.updateMany({
      where: { assignedTo: id },
      data: { assignedTo: null }
    })

    // Then delete the resource
    const deletedResource = await prisma.resource.deleteMany({
      where: {
        id: id,
        userId: user.id
      }
    })

    if (deletedResource.count === 0) {
      return res.status(404).json({ message: 'Resource not found' })
    }

    res.status(200).json({ message: 'Resource deleted successfully' })
  } catch (error) {
    console.error('Error deleting resource:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}