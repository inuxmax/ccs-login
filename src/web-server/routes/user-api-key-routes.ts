import { Router, type Request, type Response } from 'express';
import { createRouteErrorHelpers } from './route-helpers';
import {
  createUserApiKey,
  listUserApiKeys,
  revokeUserApiKey,
  updateUserApiKey,
} from '../services/user-api-key-store';

const router = Router();
const { respondInternalError } = createRouteErrorHelpers('user-api-key-routes');

function getCurrentOwner(req: Request): { ownerId: string; ownerEmail: string } | null {
  if (!req.session?.authenticated) {
    return null;
  }

  const ownerEmail = (req.session.userEmail || req.session.username || '').trim();
  if (!ownerEmail) {
    return null;
  }

  return {
    ownerId: ownerEmail.toLowerCase(),
    ownerEmail,
  };
}

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const owner = getCurrentOwner(req);
  if (!owner) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const items = await listUserApiKeys(owner.ownerId);
    res.json({ items });
  } catch (error) {
    respondInternalError(res, error, 'Failed to load user API keys.');
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const owner = getCurrentOwner(req);
  if (!owner) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { name, description, scopes } = req.body ?? {};

    if (typeof name !== 'string') {
      res.status(400).json({ error: 'Key name is required.' });
      return;
    }

    const created = await createUserApiKey({
      ownerId: owner.ownerId,
      ownerEmail: owner.ownerEmail,
      name,
      description: typeof description === 'string' ? description : undefined,
      scopes: Array.isArray(scopes) ? scopes : undefined,
    });

    res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user API key.';
    res.status(400).json({ error: message });
  }
});

router.patch('/:keyId', async (req: Request, res: Response): Promise<void> => {
  const owner = getCurrentOwner(req);
  if (!owner) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { keyId } = req.params;
    const { name, description } = req.body ?? {};

    if (name !== undefined && typeof name !== 'string') {
      res.status(400).json({ error: 'Key name must be a string.' });
      return;
    }

    if (description !== undefined && typeof description !== 'string') {
      res.status(400).json({ error: 'Description must be a string.' });
      return;
    }

    const item = await updateUserApiKey(owner.ownerId, keyId, { name, description });
    if (!item) {
      res.status(404).json({ error: 'User API key not found.' });
      return;
    }

    res.json({ item });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user API key.';
    res.status(400).json({ error: message });
  }
});

router.post('/:keyId/revoke', async (req: Request, res: Response): Promise<void> => {
  const owner = getCurrentOwner(req);
  if (!owner) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const { keyId } = req.params;
    const item = await revokeUserApiKey(owner.ownerId, keyId);
    if (!item) {
      res.status(404).json({ error: 'User API key not found.' });
      return;
    }

    res.json({ success: true, item });
  } catch (error) {
    respondInternalError(res, error, 'Failed to revoke user API key.');
  }
});

export default router;
