const express = require('express');
const router = express.Router();
const { createActivity, getActivityById, getActivityByName, getAllActivities, updateActivity, getPublicRoutinesByActivity, getUserById } = require('../db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

async function requiredUser(req, res, next) {
  const prefix = 'Bearer ';
  const authorize = req.headers.authorization;

  if (!authorize) {
    res.status(401).send({
      error: 'Unauthorized',
      message: 'Log in',
    });
  } else if (authorize.startsWith(prefix)) {
    const token = authorize.slice(prefix.length);

    try {
      const { id } = jwt.verify(token, JWT_SECRET);

      if (id) {
        const username = await getUserById(id);
        req.user = username;
        next();
      }
    } catch ({ name, message }) {
      next({ name, message });
    }
  }
}

// GET /api/activities/:activityId/routines
router.get('/:activityId/routines', async (req, res, next) => {
  const { activityId } = req.params;

  try {
    const activity = await getActivityById(activityId);
    if (!activity) {
      res.status(404).send({
        error: 'Activity not found',
        message: `Activity ${activityId} not found`,
        name: 'ActivityNotFound',
      });
    }

    const publicRoutines = await getPublicRoutinesByActivity(activityId);
    res.send(publicRoutines);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

// GET /api/activities
router.get('/', async (req, res, next) => {
  try {
    const activities = await getAllActivities();
    res.send(activities);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

// POST /api/activities
router.post('/', requiredUser, async (req, res, next) => {
  const { name, description } = req.body;

  try {
    const existingActivity = await getActivityByName(name);

    if (existingActivity) {
      res.status(409).send({
        error: 'Activity already exists',
        message: `An activity with name ${name} already exists`,
        name: 'ActivityAlreadyExists',
      });
    } else {
      const createdActivity = await createActivity(name, description);
      res.send(createdActivity);
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});

// PATCH /api/activities/:activityId
router.patch('/:activityId', requiredUser, async (req, res, next) => {
  const { activityId } = req.params;
  const { name, description } = req.body;

  try {
    const existingActivity = await getActivityById(activityId);

    if (!existingActivity) {
      res.status(404).send({
        error: 'Activity not found',
        message: `Activity ${activityId} not found`,
        name: 'ActivityNotFound',
      });
    } else {
      const activityByName = await getActivityByName(name);

      if (activityByName && activityByName.id !== activityId) {
        res.status(409).send({
          error: 'Activity already exists',
          message: `An activity with name ${activityByName.name} already exists`,
          name: 'ActivityAlreadyExists',
        });
      } else {
        const updatedActivity = await updateActivity(activityId, name, description);
        res.send(updatedActivity);
      }
    }
  } catch ({ name, message }) {
    next({ name, message });
  }
});

module.exports = router;
