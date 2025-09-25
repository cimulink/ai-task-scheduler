import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    return handleGetProject(req, res)
  } else if (req.method === 'PUT') {
    return handleUpdateProject(req, res)
  } else if (req.method === 'DELETE') {
    return handleDeleteProject(req, res)
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
    return res.status(405).json({ message: 'Method not allowed' })
  }
}

async function handleGetProject(req: NextApiRequest, res: NextApiResponse) {
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

    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.id
      },
      include: {
        tasks: {
          include: {
            assignee: true
          },
          orderBy: { priority: 'desc' }
        }
      }
    })

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    res.status(200).json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleUpdateProject(req: NextApiRequest, res: NextApiResponse) {
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

    const { title, description, status } = req.body

    const project = await prisma.project.updateMany({
      where: {
        id: id,
        userId: user.id
      },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(status && { status })
      }
    })

    if (project.count === 0) {
      return res.status(404).json({ message: 'Project not found' })
    }

    // Fetch updated project
    const updatedProject = await prisma.project.findFirst({
      where: {
        id: id,
        userId: user.id
      },
      include: {
        tasks: true
      }
    })

    res.status(200).json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleDeleteProject(req: NextApiRequest, res: NextApiResponse) {
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

    const deletedProject = await prisma.project.deleteMany({
      where: {
        id: id,
        userId: user.id
      }
    })

    if (deletedProject.count === 0) {
      return res.status(404).json({ message: 'Project not found' })
    }

    res.status(200).json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}