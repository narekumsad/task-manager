const express = require('express');
const Task = require('../models/task');
const auth = require('../middleware/auth');
const STATUS = require('../globals/globals').STATUS;

const router = express.Router();

router.post('/task', auth, async (req, res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    });
    
    try {
        await task.save();
        res.status(STATUS.OK_CREATED).send(task);
    } catch(e) {
        res.status(STATUS.BAD_REQUEST).send(e);
    }
});

router.get('/task', auth, async (req, res) => {
    try {
        //const tasks = await Task.find({ owner: req.user._id });
        // Below code is alternate way (middleware virtual method, see user model code)
        const match = {};
        const sort = {};

        if (req.query.completed) {
            match.completed = (req.query.completed === 'true');
        }

        if (req.query.sortBy) {
            const parts = req.query.sortBy.split(':');
            sort[parts[0]] = (parts[1] === 'desc' ? -1 : 1);
        }
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate();
        res.status(STATUS.OK).send(req.user.tasks);
    } catch(e) {
        res.status(STATUS.INTERNAL_SERVER_ERROR).send();
    }
});

router.get('/task/:id', auth, async (req, res) => {
    try {
        const _id = req.params.id;
        const task = await Task.findOne({_id, owner: req.user._id});
        if (!task) return res.status(STATUS.NOT_FOUND).send();
        res.status(STATUS.OK).send(task);
    } catch(e) {
        res.status(STATUS.NOT_FOUND).send();
    }
});

router.patch('/task/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['description', 'completed'];
    const isValidOperation = updates.every(key => allowedUpdates.includes(key));

    if (!isValidOperation || !updates.length)
        return res.status(STATUS.BAD_REQUEST).send({error: 'Invalid updates!'});

    try {
        const task = await Task.findOne({_id: req.params.id, owner: req.user._id});
        
        if (!task) return res.status(STATUS.NOT_FOUND).send();

        updates.forEach((update) => task[update] = req.body[update]);
        await task.save();
        res.status(STATUS.OK).send(task);
    } catch(e) {
        res.status(STATUS.BAD_REQUEST).send(e);
    }
});

router.delete('/task/:id',  auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id });

        if (!task) return res.status(STATUS.NOT_FOUND).send({error: 'Document not found'});

        res.status(STATUS.OK).send(task);
    } catch(e) {
        res.status(STATUS.BAD_REQUEST).send(e);
    }
});

module.exports = router;