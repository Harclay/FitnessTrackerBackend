const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const {
  getRoutineActivityById,
  getRoutineById,
  updateRoutineActivity,
  destroyRoutineActivity,
  getUserById,
} = require('../db');

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

// PATCH /api/routine_activities/:routineActivityId
router.patch('/:routineActivityId', requiredUser, async (req, res, next) => {
  const { routineActivityId } = req.params;
  const { duration, count } = req.body;
  const { id: userId, username } = req.user;

  try {
    const routineActivity = await getRoutineActivityById(routineActivityId);
    const routine = await getRoutineById(routineActivity.routineId);

    if (!routineActivity) {
      return res.status(404).send({
        error: 'Routine Activity does not exist',
        message: 'Routine Activity does not exist',
        name: 'RoutineActivityDoesntExist',
      });
    }

    if (routine.creatorId !== userId) {
      return res.status(403).send({
        error: 'Unauthorized update',
        message: `User ${username} is not allowed to update ${routine.name}`,
        name: 'UnauthorizedUpdate',
      });
    }

    if (!duration && !count) {
      return res.status(400).send({
        error: 'Update Needed',
        message: 'Need to update field(s) to process change',
        name: 'UpdateNeeded',
      });
    }

    const update = await updateRoutineActivity({
      duration,
      count,
      id: routineActivityId,
    });

    res.send(update);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

// DELETE /api/routine_activities/:routineActivityId
router.delete('/:routineActivityId', requiredUser, async (req, res, next) => {
  const { routineActivityId } = req.params;
  const { id: userId, username } = req.user;

  try {
    const routineActivity = await getRoutineActivityById(routineActivityId);
    const routine = await getRoutineById(routineActivity.routineId);

    if (!routineActivity) {
      return res.status(404).send({
        error: 'Routine Activity does not exist',
        message: 'Routine Activity does not exist',
        name: 'RoutineActivityDoesntExist',
      });
    }

    if (routine.creatorId !== userId) {
      return res.status(403).send({
        error: 'Unauthorized delete',
        message: `User ${username} is not allowed to delete ${routine.name}`,
        name: 'UnauthorizedDelete',
      });
    }

    const deleteRoutineActivity = await destroyRoutineActivity(routineActivityId);

    res.send(deleteRoutineActivity);
  } catch ({ name, message }) {
    next({ name, message });
  }
});

module.exports = router;
