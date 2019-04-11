const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/user');
const auth = require('../middleware/auth');
const STATUS = require('../globals/globals').STATUS;

const router = express.Router();

router.post('/user', async (req, res) => {
    const user = new User(req.body);

    try {
        await user.save();
        const token = await user.generateAuthToken();
        res.status(STATUS.OK_CREATED).send({user, token});
    } catch(e) {
        res.status(STATUS.BAD_REQUEST).send(e);
    }
})

router.post('/user/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.status(STATUS.OK).send({user, token});
    } catch(e) {
        res.status(STATUS.UNAUTHORIZED).send();
    }
});

router.get('/user/me', auth, async (req, res) => {
    res.send(req.user);
})

// router.get('/user/:id', auth, async (req, res) => {
//     try {
//         const user = await User.findById(req.params.id);
//         if(!user) return res.status(404).send();
//         res.status(STATUS.OK).send(user);
//     } catch(e) {
//         res.status(STATUS.NOT_FOUND).send();
//     }
// });

router.patch('/user/me', auth, async (req, res) => {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'password', 'email', 'age'];
    const isValidOperation = updates.every(key => allowedUpdates.includes(key));

    if (!isValidOperation || !updates.length)
        return res.status(STATUS.BAD_REQUEST).send({error: 'Invalid updates!'});

    try {
        const user = req.user;
        
        updates.forEach((update) => user[update] = req.body[update]);

        await user.save();

        res.status(STATUS.OK).send(user);
    } catch(e) {
        res.status(STATUS.BAD_REQUEST).send(e);
    }
})

router.delete('/user/me',  auth, async (req, res) => {
    try {
        // const user = await User.findByIdAndDelete(req.params.id);

        // if (!user) return res.status(STATUS.NOT_FOUND).send({error: 'Document not found'});
        await req.user.remove();

        res.status(STATUS.OK).send(req.user);
    } catch(e) {
        res.status(STATUS.BAD_REQUEST).send(e);
    }
})

router.post('/user/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token);
        await req.user.save();
        res.status(STATUS.OK).send();
    } catch(e) {
        res.status(STATUS.INTERNAL_SERVER_ERROR).send();
    }
})

router.post('/user/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        res.status(STATUS.OK).send();
    } catch(e) {
        res.status(STATUS.INTERNAL_SERVER_ERROR).send(e);
    }
})

const upload = multer({
    //dest: 'avatar',
    limits: {
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('File type jpg, jpeg and png allowed'));
        }
        cb(undefined, true);
    }
});

router.post('/user/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    req.user.avatar = await sharp(req.file.buffer).resize({ width: 250, height: 250}).png().toBuffer();
    await req.user.save();
    res.status(STATUS.OK).send();
}, (error, req, res, next) => {
    res.status(STATUS.NOT_FOUND).send({ Error: error.message });
})

router.get('/user/:id/avatar', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user || !user.avatar) {
            throw new Error();
        }
        res.set('Content-Type', 'image/png');
        res.send(user.avatar);
    } catch(e) {
        res.status(STATUS.NOT_FOUND).send();
    }
})

router.delete('/user/me/avatar', auth, async (req, res) => {
    delete req.user.avatar;

    await req.user.save();

    res.send();
})

module.exports = router;