import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createResourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  role: z.string().min(1, 'Role is required').max(100, 'Role too long'),
  weeklyHours: z.number().min(1, 'Weekly hours must be at least 1').max(60, 'Weekly hours cannot exceed 60'),
  skills: z.array(z.string()).optional().default([])
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetResources(req, res)
  } else if (req.method === 'POST') {
    return handleCreateResource(req, res)
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }
}

async function handleGetResources(req: NextApiRequest, res: NextApiResponse) {
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

    const resources = await prisma.resource.findMany({
      where: { userId: user.id },
      include: {
        tasks: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          },
          where: {
            status: {
              in: ['pending', 'in_progress']
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate bandwidth utilization for each resource
    const resourcesWithBandwidth = resources.map(resource => {
      const totalAssignedHours = resource.tasks.reduce(
        (total, task) => total + (task.estimatedHours || 0),
        0
      )

      return {
        ...resource,
        assignedTasks: resource.tasks, // Rename for frontend consistency
        totalAssignedHours,
        remainingHours: Math.max(0, resource.weeklyHours - totalAssignedHours),
        utilizationPercentage: Math.round((totalAssignedHours / resource.weeklyHours) * 100)
      }
    })

    res.status(200).json(resourcesWithBandwidth)
  } catch (error) {
    console.error('Error fetching resources:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleCreateResource(req: NextApiRequest, res: NextApiResponse) {
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

    const validatedData = createResourceSchema.parse(req.body)

    const resource = await prisma.resource.create({
      data: {
        name: validatedData.name,
        role: validatedData.role,
        weeklyHours: validatedData.weeklyHours,
        skills: validatedData.skills,
        userId: user.id
      }
    })

    res.status(201).json(resource)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors
      })
    }
    console.error('Error creating resource:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}