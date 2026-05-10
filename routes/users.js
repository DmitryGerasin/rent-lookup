/**
 * User Routes
 * 
 * Handles:
 * - Login/Logout authentication
 */

const auth              = require('../security/auth')
const {
   REGISTRATION_ENABLED,
   RECAPTCHA_SITE_KEY,
   appName,
}                       = require('../config')
const {
   safeReturnPath,
}                       = require(`../security/safeReturnPath`)
const errHandling       = require('./errorHandling')
const errorCodes        = require('../middleware/errorCodes')
const express           = require('express')
const passport          = require('passport')
const router            = express.Router()
const security          = require('../security/captcha')
const { timeStamp }     = require('../utils/timeStamp')


/*============================================================================
= = = = = = = = = = = = = = = = = = ROUTES = = = = = = = = = = = = = = = = = =
============================================================================*/

router.get('/login', auth.ensureNotAuthenticated, getLogin)
router.post('/login', auth.ensureNotAuthenticated, security.ensureCaptcha, authenticate)
router.delete('/logout', auth.ensureAuthenticated, logout)

module.exports = router

/*===========================================================================
= = = = = = = = = = = = = = = = = FUNCTIONS = = = = = = = = = = = = = = = = =
===========================================================================*/

async function getLogin(req, res) {
   try {
      res.render('./login/index', {
         appName,
         captchaSiteKey: RECAPTCHA_SITE_KEY,
         pageTitle: 'Connexion',
         useLayout: false,
         registrationEnabled: REGISTRATION_ENABLED,
      })
   } catch (err) {
      return errHandling(req, res, err, __filename, 'getLogin', 'HTML')
   }
}

function authenticate(req, res, next) {
   passport.authenticate('local', async (err, user, info) => {
      try {
         if (err) {
            return res.status(500).json({
               ok: false,
               error: {
                  name: 'Erreur de connexion',
                  message: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
                  type: 'CUSTOM',
               },
            })
         }

         if (!user) {
            return res.status(401).json({
               ok: false,
               error: {
                  name: 'Identifiants invalides',
                  message: info?.message || 'Le courriel ou le mot de passe est invalide.',
                  type: 'CUSTOM',
               },
            })
         }

         const postLoginRedirect = safeReturnPath(req.session.redirectTo)

         req.session.regenerate(async (regenErr) => {
            if (regenErr) {
               return res.status(500).json({
                  ok: false,
                  error: {
                     name: 'Erreur de session',
                     message: 'Impossible de sécuriser la session.',
                     type: 'CUSTOM',
                  },
               })
            }

            try {
               await new Promise((resolve, reject) => {
                  req.logIn(user, (loginErr) => {
                     if (loginErr) return reject(loginErr)
                     resolve()
                  })
               })

               res.json({
                  ok: true,
                  redirect: postLoginRedirect,
               })

               delete req.session.redirectTo
            } catch (loginError) {
               return res.status(500).json({
                  ok: false,
                  error: {
                     name: 'Erreur de connexion',
                     message: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
                     type: 'CUSTOM',
                  },
               })
            }
         })
      } catch (loginError) {
         return res.status(500).json({
            ok: false,
            error: {
               name: 'Erreur de connexion',
               message: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
               type: 'CUSTOM',
            },
         })
      }
   })(req, res, next)
}

function logout(req, res, next) {
   req.logout(function (err) {
      if (err) {
         return res.status(500).json({
            ok: false,
            error: {
               name: 'Erreur',
               message: 'La déconnexion a échoué. Veuillez réessayer.',
               type: 'CUSTOM',
            },
         })
      }

      req.session.regenerate((regenErr) => {
         if (regenErr) {
            console.error(timeStamp(), 'logout() --> req.session.regenerate() failed, error:')
            console.error(regenErr)
            return res.status(500).json({
               ok: false,
               error: {
                  name: 'Erreur',
                  message: 'Erreur lors de la réinitialisation de session.',
                  type: 'NON-CUSTOM',
               },
            })
         }

         req.flash('success', 'Votre connexion a été terminée avec succès.')

         return res.json({
            ok: true,
            redirect: '/users/login',
         })
      })
   })
}
