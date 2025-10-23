const User = require('../models/user')
const jwt = require('jsonwebtoken')
const {OAuth2Client} = require('google-auth-library')
const { expressjwt } = require("express-jwt")
require('dotenv').config()
const _ = require('lodash')
const sgMail = require('@sendgrid/mail')
const user = require('../models/user')
const { response } = require('express')
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const nodemailer = require('nodemailer');


// exports.signup = (req, res) => {
//     console.log('REQ BODY ON SIGNUP', req.body);
//     const {name, email, password} = req.body

//     // User.findOne({email}).exec((err, user) => {
//     //     if(user) {
//     //         return res.status(400).json({
//     //             error: 'Email is taken'
//     //         })
//     //     }
//     // })

//     let auth = User.findOne({email}).exec()
//         auth.then(( user) => {
//             if(user) {
//                 return res.status(401).json({
//                     error: 'Email is taken'
//                 })
//             }
//         })

//     // async function auth() {
//     //     const doc = await User.findOne({email}).exec();
//     //     if(doc) {
//     //         return res.status(400).json({
//     //             error: 'Email is taken'
//     //         })
//     //     }
//     // }
//     // auth();    
        

//     let newUser = new User({name, email, password});

//     // newUser.save((err, success) => {
//     //     if (err) {
//     //         console.log('SIGNUP ERROR', err);
//     //         return res.status(400).json({
//     //             error: err
//     //         })
//     //     }
//     //     res.json({
//     //         message: 'Signup success! Please signin'
//     //     })
//     // })

//     newUser.save()
//         .then(()=>{
//             res.json({
//                 message: 'Signup success! Please signin'
//             })
//         })
//         .catch((err)=>{
//             console.log('SIGNUP ERROR', err);
//             return res.status(400).json({
//                 error: err
//             })
//         })
// }

// exports.signup = (req, res) => {
//     const {name, email, password} = req.body

//     const auth = User.findOne({email}).exec()
//     auth.then(( user) => {
//         if(user) {
//             return res.status(401).json({
//                 error: 'Email is taken'
//             })
//         }

//         const token = jwt.sign({name, email, password}, process.env.JWT_ACCOUNT_ACTIVATION, {expiresIn: '10m'})

//         const transporter = nodemailer.createTransport({
//           service: 'gmail',
//           auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASSWORD,
//           }
//         });
        
//         send();
        
//         async function send() {
//             const result = await transporter.sendMail({
//                 from: 'obedh61@gmail.com',
//                 to: email,
//                 subject: `Account activation link`,
//                 text: 'welcome to gan montessori second home',
//                 html: `
//                 <h1>Please use the following link to activate your account</h1>
//                 <p>${process.env.CLIENR_URL}/auth/activate/${token}</p>
//                 <hr />
//                 <p>This email contain sensetive information</p>
//                 <p>${process.env.CLIENR_URL}</p>
//                 `
//             });
        
//             console.log(JSON.stringify(result, null, 4));
//         }
//     })

// }

exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Verificar si el email ya está registrado
    const existingUser = await User.findOne({ email }).exec();
    if (existingUser) {
      return res.status(401).json({
        error: 'Email is already taken',
      });
    }

    // Crear el token de activación
    const token = jwt.sign({ name, email, password }, process.env.JWT_ACCOUNT_ACTIVATION, { expiresIn: '10m' });

    // Configuración del transporte de nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Enviar correo de activación
    await sendActivationEmail(email, token, transporter);

    // Responder al cliente con éxito
    res.status(200).json({
      message: 'Signup successful! Please check your email to activate your account.',
    });

  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({
      error: 'An error occurred during the signup process. Please try again later.',
    });
  }
};

const sendActivationEmail = async (email, token, transporter) => {
  try {
    const curl = process.env.NODE_ENV === 'production' ? 'https://gansecondhome.com' : process.env.CLIENT_URL
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Account activation link',
      text: 'Welcome to Gan Montessori Second Home',
      html: `
        <h1>Please use the following link to activate your account</h1>
        <p>${curl}/auth/activate/${token}</p>
        <hr />
        <p>This email contains sensitive information</p>
        <p>${curl}</p>
      `,
    });
    
    
    console.log('Activation email sent:', JSON.stringify(result, null, 4));
  } catch (error) {
    console.error('Error sending activation email:', error);
    throw new Error('Error sending activation email');
  }
};

exports.accountActivation = (req, res) => {
  const {token} = req.body

  if(token) {
    jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function(err, decoded) {
      if(err) {
        console.log('JWT VERIFY IN ACCOUNT ACTIVATION ERROR', err)
        return res.status(401).json({
          error: 'Expired link. Signup again'
        })
      }
      const {name, email, password} = jwt.decode(token)

      const user = new User({name, email, password});

      user.save()
      .then(()=>{
          res.json({
              message: 'Signup success! Please signin'
          })
      })
      .catch((err)=>{
          console.log('SIGNUP ERROR', err);
          return res.status(401).json({
              error: 'Error saving user in database. Try signup again'
          })
      })
    })
  }
}

exports.signin = (req, res) => {
  const {email, password} = req.body
  //check if user exist
  const auth = User.findOne({email}).exec()
  auth.then((user) => {
    if(!user) {
      return res.status(400).json({
        error: 'User does not exist. Please signup'
      })
    }
    //authenticate
    if(!user.authenticate(password)) {
      return res.status(400).json({
        error: 'Email and password do not match'
      })
    }
    // generate a token and send to client
    const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'})
    const { _id, name, email, role } = user;

    return res.json({
      token,
      user: { _id, name, email, role }
    })
  })
}

// exports.signin = async (req, res) => {
//   // Debugging: Log the request body
//   console.log('Request Body:', req.body);

//   const { email, password } = req.body;

//   // Validar que el correo y la contraseña estén presentes
//   // if (!email || !password) {
//   //   return res.status(400).json({
//   //     error: 'Both email and password are required',
//   //   });
//   // }

//   try {
//     // Verificar si el usuario existe
//     const user = await User.findOne({ email }).exec();
//     console.log('User:', user); // Debugging: Log the user object

//     if (!user) {
//       return res.status(400).json({
//         error: 'User does not exist. Please signup',
//       });
//     }

//     // Verificar si la contraseña es correcta
//     if (!user.authenticate(password)) {
//       return res.status(400).json({
//         error: 'Email and password do not match',
//       });
//     }

//     // Generar el token JWT
//     const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

//     // Desestructurar los datos del usuario que se enviarán en la respuesta
//     const { _id, name, email, role } = user;

//     // Responder con el token y los datos del usuario
//     return res.json({
//       token,
//       user: { _id, name, email, role },
//     });

//   } catch (error) {
//     console.error('Error during signin:', error);
//     return res.status(500).json({
//       error: 'Something went wrong. Please try again later.',
//     });
//   }
// };


exports.requireSingin = expressjwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"]
})

exports.adminMiddleware = (req, res, next) => {
  User.findById({_id: req.auth._id}).exec()
    .then(user => {
      if(!user) {
        return res.status(400).json({
          error: 'User does not exist. '
        })
      }

      if (user.role !== 'admin') {
        return res.status(400).json({
          error: 'Admin resource. Access denied.'
        })
      }

      req.profile = user;
      next();
    })
    .catch(e => {
      console.log(e);
    })
}

// exports.forgotPassword = (req, res) => {
//   const {email} = req.body

//   User.findOne({email}).exec()
//     .then(user => {
//       if(!user) {
//         return res.status(400).json({
//           error: 'User does not exist. '
//         })
//       }

//       const token = jwt.sign({_id: user._id}, process.env.JWT_RESET_PASSWORD, {expiresIn: '10m'})

//       const emailData = {
//           to: [email],
//           from: {
//             name: 'Mern Auth',
//             email: process.env.EMAIL_FROM
//           },
//           subject: `Password reset link`,
//           text: 'and easy to do anywhere, even with Node.js',
//           html: `
//               <h1>Please use the following link to reset your password.</h1>
//               <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
//               <hr />
//               <p>This email contain sensetive information</p>
//               <p>${process.env.CLIENT_URL}</p>
//           `
//       }

//       return user.updateOne({resetPasswordLink: token})
//         .then(success => {
//           async function sendEmail() {
//             try {
//               let sent = await sgMail.send(emailData);
//               console.log('SIGNUP EMAIL SENT',sent)
//               return res.json({
//                     message: `Email has been sent to ${email}. follow the instruction to activate your account`
//               })
//             } catch (error) {
//               console.error(error);
          
//               if (error.response) {
//                 console.error(error.response.body)
//               }
//             }
//           }
//           sendEmail();
//         })
//         .catch(e => console.log('reset error', e))

      

//     })
// }

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Verificar si el usuario existe
    const user = await User.findOne({ email }).exec();
    if (!user) {
      return res.status(400).json({
        error: 'User does not exist.',
      });
    }

    // Crear el token de restablecimiento de contraseña
    const token = jwt.sign({ _id: user._id }, process.env.JWT_RESET_PASSWORD, { expiresIn: '10m' });

    // Actualizar el usuario con el token de restablecimiento
    user.resetPasswordLink = token;
    await user.save();
    const curl = process.env.NODE_ENV === 'production' ? 'https://gansecondhome.com' : process.env.CLIENT_URL
    // Crear el contenido del correo electrónico
    const emailData = {
      from: process.env.EMAIL_USER, // El correo desde el cual se enviará el mensaje
      to: email, // El correo del usuario al que se enviará el mensaje
      subject: 'Password reset link',
      text: 'and easy to do anywhere, even with Node.js',
      html: `
        <h1>Please use the following link to reset your password.</h1>
        <p>${curl}/auth/password/reset/${token}</p>
        <hr />
        <p>This email contains sensitive information</p>
        <p>${curl}</p>
      `,
    };

    // Configuración del transporte de Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Usamos el servicio de Gmail, pero puedes cambiarlo según sea necesario.
      auth: {
        user: process.env.EMAIL_USER, // Usuario del correo que enviará el mensaje
        pass: process.env.EMAIL_PASSWORD, // Contraseña del correo
      },
    });

    // Enviar el correo electrónico
    const result = await transporter.sendMail(emailData);

    console.log('Password reset email sent', result);
    return res.json({
      message: `Email has been sent to ${email}. Please follow the instructions to reset your password.`,
    });

  } catch (error) {
    console.error('Error during forgot password process:', error);
    
    // Si ocurrió un error durante la consulta de la base de datos o el envío de correo, respondemos con un error
    return res.status(500).json({
      error: 'There was an error processing your request. Please try again later.',
    });
  }
};

exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  if (resetPasswordLink) {
    jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, function(err, decode) {
      if(err) {
        return res.status(400).json({
          error: 'Expired link. try again'
        })
      }

      User.findOne({resetPasswordLink}).exec()
        .then(user => {
          if(!user) {
            return res.status(400).json({
              error: 'Something went wrong. Try later'
            })
          }

          const updateFields = {
            password: newPassword,
            resetPasswordLink: ''
          }

          user = _.extend(user, updateFields)

          user.save()
            .then(result => {
              res.json({
                message: `Great! Now you can login with your new password`
              })
            })
            .catch(e => {
                return res.status(400).json({
                error: 'Something went wrong with reset.'
              })
            })
        })
    })
  }
}

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
exports.googleLogin = (req, res) => {
  const { idToken } = req.body

  client.verifyIdToken({idToken, audience: process.env.GOOGLE_CLIENT_ID})
    .then(response => {
      const { email_verified, name, email } = response.payload
      if(email_verified) {
        User.findOne({email}).exec()
        .then(user => {
          if(user) {
            const token = jwt.sign({_id: user._id}, process.env.JWT_SECRET, {expiresIn: '7d'})
            const {_id, email, name, role} = user
            return res.json({
              token, user: {_id, email, name, role}
            })
          } else {
            let password = email + process.env.JWT_SECRET
            user = new User({name, email, password})
            user.save()
              .then(data => {
                const token = jwt.sign({_id: data._id}, process.env.JWT_SECRET, {expiresIn: '7d'})
                const {_id, email, name, role} = data
                return res.json({
                  token, user: {_id, email, name, role}
                })
              })
              .catch(e => {
                  return res.status(400).json({
                    error: 'error google login.'
                  })
              })
          }

          
        })
      } else {
        return res.status(400).json({
          error: 'google login failed.'
        })
      }
    })
}
