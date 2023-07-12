const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const {
  getAllRoutines,
  getUserById,
  createRoutine,
  getRoutineById,
  destroyRoutine,
  getRoutineActivitiesByRoutine,
  addActivityToRoutine,
  updateRoutine,
} = require('../db');

const { JWT_SECRET } = process.env;

async function requiredUser(req, res, next) {
  const prefix = 'Bearer ';
  const authorize = req.headers.authorization;

  if (!authorize) {
    res.status(401).send({
      error: 'Unauthorized',
      message: 'You must be logged in to perform this action',
      name: 'NotLoggedIn',
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

// GET /api/routines
router.get('/', async (req, res, next) => {
  try {
    const routines = await getAllRoutines();
    res.send(routines);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

// POST /api/routines
router.post('/', requiredUser, async (req, res, next) => {
  const { isPublic, name, goal } = req.body;
  const { id: userId } = req.user;

  try {
    const routines = await getAllRoutines();
    const existingRoutine = routines.find((routine) => routine.name === name);

    if (existingRoutine) {
      return res.status(409).send({
        error: 'Routine Already Exists',
        message: `A routine with name ${name} already exists`,
        name: 'RoutineAlreadyExists',
      });
    }

    const newRoutine = await createRoutine({
      creatorId: userId,
      isPublic,
      name,
      goal,
    });

    res.send(newRoutine);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

// PATCH /api/routines/:routineId
router.patch('/:routineId', requiredUser, async (req, res, next) => {
  const { routineId } = req.params;
  const { isPublic, name, goal } = req.body;
  const { id: userId, username } = req.user;

  try {
    const routine = await getRoutineById(routineId);

    if (routine.creatorId !== userId) {
      return res.status(403).send({
        error: 'Unauthorized',
        message: `User ${username} is not allowed to update ${routine.name}`,
        name: 'UnauthorizedUser',
      });
    }

    if (!isPublic && !name && !goal) {
      return res.status(400).send({
        error: 'No Update',
        message: 'No fields to update',
        name: 'NoUpdate',
      });
    }

    const updatedRoutine = await updateRoutine({
      id: routineId,
      isPublic,
      name,
      goal,
    });

    res.send(updatedRoutine);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

// DELETE /api/routines/:routineId
router.delete('/:routineId', requiredUser, async (req, res, next) => {
  const { routineId } = req.params;
  const { id: userId, username } = req.user;

  try {
    const routine = await getRoutineById(routineId);

    if (!routine) {
      return res.status(404).send({
        error: 'Routine Not Found',
        message: 'Routine was not found',
        name: 'RoutineNotFound',
      });
    }

    if (routine.creatorId !== userId) {
      return res.status(403).send({
        error: 'Unauthorized',
        message: `User ${username} is not allowed to delete ${routine.name}`,
        name: 'UnauthorizedUser',
      });
    }

    const deletedRoutine = await destroyRoutine(routineId);

    res.send(deletedRoutine);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

// POST /api/routines/:routineId/activities
router.post('/:routineId/activities', requiredUser, async (req, res, next) => {
  const { routineId } = req.params;
  const { activityId, duration, count } = req.body;

  try {
    const routine = await getRoutineById(routineId);

    if (!routine) {
      return res.status(404).send({
        error: 'Routine Not Found',
        message: 'Routine was not found',
        name: 'RoutineNotFound',
      });
    }

    const routineActivities = await getRoutineActivitiesByRoutine({ id: routineId });

    const existingActivity = routineActivities.find((activity) => activity.activityId === activityId);

    if (existingActivity) {
      return res.status(409).send({
        error: 'Activity Already Exists',
        message: `Activity ID ${activityId} already exists in Routine ID ${routineId}`,
        name: 'ActivityAlreadyExists',
      });
    }

    const newRoutineActivity = await addActivityToRoutine({
      routineId,
      activityId,
      duration,
      count,
    });

    res.send(newRoutineActivity);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

module.exports = router;
