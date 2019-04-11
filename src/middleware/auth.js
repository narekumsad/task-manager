const jwt = require('jsonwebtoken');
const User = require('../models/user');
const globals = require('../globals/globals');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decode = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findOne({ _id: decode._id, 'tokens.token': token});

        if(!user) throw new Error({error: 'Authentication error'});

        req.token = token;
        req.user = user;

        next();
    } catch(e) {
        res.status(globals.STATUS.UNAUTHORIZED).send({ error: 'Authentication error'});
    }
};

module.exports = auth;