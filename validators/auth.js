const { check } = require('express-validator')

exports.userSignupValidator = [
    check('name')
        .not()
        .isEmpty()
        .withMessage((value, { req }) => req.t('validation.nameRequired')),
    check('email')
        .isEmail()
        .withMessage((value, { req }) => req.t('validation.validEmail')),
    check('password')
        .isLength({min: 6})
        .withMessage((value, { req }) => req.t('validation.passwordMinLength'))
]

exports.userSigninValidator = [
    check('email')
        .isEmail()
        .withMessage((value, { req }) => req.t('validation.validEmail')),
    check('password')
        .isLength({min: 6})
        .withMessage((value, { req }) => req.t('validation.passwordMinLength'))
]

exports.forgotPasswordValidator = [
    check('email')
        .not()
        .isEmpty()
        .isEmail()
        .withMessage((value, { req }) => req.t('validation.validEmail'))
]

exports.resetPasswordValidator = [
    check('newPassword')
        .not()
        .isEmpty()
        .isLength({ min: 6 })
        .withMessage((value, { req }) => req.t('validation.passwordMinLength'))
]