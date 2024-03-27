import express from "express";
import sequelize from "./config/database.js";
import User from "./models/User.js";
import email_token from "./models/email_token.js";
import bcrypt from "bcrypt";
import { body, checkExact, validationResult } from "express-validator";
import expressWinston from "express-winston";
import { format, transports } from "winston";
import winston from "winston";
import jwt from "jsonwebtoken";
import { PubSub } from "@google-cloud/pubsub";
import { v4 as uuidv4 } from "uuid";


let logFilePath = "";
if (process.env.NODE_ENV == "test") {
  logFilePath = "./events.log"
} else {
  logFilePath = "/var/log/webapp/events.log"
}

const app = express();
app.use(express.json());

app.use(
  expressWinston.logger({
    transports: [
      new transports.File({ filename: logFilePath }),
    ],
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    requestWhitelist: [
      "url",
      "headers",
      "method",
      "httpVersion",
      "originalUrl",
      "query",
      "body",
    ],
    bodyBlacklist: ["password"],
    responseWhitelist: ["statusCode", "statusMessage", "body"],
    statusLevels: true,
  })
);

const logger = winston.createLogger({
  transports: [new transports.File({ filename: logFilePath })],
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
});

// Database connection
const initApp = async () => {
  logger.info("Testing the database connection...");
  try {
    await sequelize.authenticate();
    logger.info("Connection has been established successfully.");

    await sequelize.sync({ alter: true });
  } catch (error) {
    logger.error("Unable to connect to the database:", error);
  }
};

initApp();

// Middlewares
const dbConnCheck = async (req, res, next) => {
  sequelize
    .query("SELECT 1")
    .then((result) => {
      next();
    })
    .catch((error) => {
      res.status(503).send();
    });
};

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  } else {
    return res.status(400).send(errors);
  }
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.get("Authorization");
  if (!authHeader) {
    res.setHeader("WWW-Authenticate", "Basic");
    res.status(401).send();
    return;
  }

  const encodedCredentials = authHeader.split(" ")[1];
  const decodedCredentials = Buffer.from(encodedCredentials, "base64").toString(
    "utf-8"
  );
  const [username, password] = decodedCredentials.split(":");

  User.findOne({
    where: {
      email: username,
    },
  })
    .then(async (result) => {
      if (result) {
        const passwordMatch = await bcrypt.compare(
          password,
          result.dataValues.password
        );
        if (passwordMatch) {
          req.user = result.dataValues;
          next();
        } else {
          res.setHeader("WWW-Authenticate", "Basic");
          res.status(401).send();
        }
      } else {
        res.status(404).send();
      }
    })
    .catch((err) => {
      res.status(400).send(err);
    });
};

// Create User API
app.post(
  "/v1/user",
  [
    body("email").notEmpty().withMessage("email is required").bail().isEmail(),
    body("password").notEmpty().withMessage("password is required"),
    body("firstName").notEmpty().withMessage("firstName is required"),
    body("lastName").notEmpty().withMessage("lastName is required"),
  ],
  validateRequest,
  async (req, res) => {
    try {
      // User creation
      const hash = await bcrypt.hash(req.body.password.toString(), 13);

      const newUser = await User.create({
        email: req.body.email,
        password: hash,
        first_name: req.body.firstName,
        last_name: req.body.lastName,
      });

      // Pub Sub process
      const pubSubClient = new PubSub();

      const user = {
        user_id: newUser.dataValues.id,
        email: newUser.dataValues.email,
        first_name: newUser.dataValues.first_name,
        last_name: newUser.dataValues.last_name,
        token: uuidv4()
      };

      const dataBuffer = Buffer.from(JSON.stringify(user));
      const messageId = await pubSubClient.topic("verify_email").publish(dataBuffer);

      delete newUser.dataValues.password;
      res.status(201).send(newUser);
    } catch (err) {
      res.status(400).send(err);
    }
  }
);

// Get User API
app.get(
  "/v1/user/self",
  [checkExact()],
  validateRequest,
  authMiddleware,
  async (req, res) => {
    delete req.user.password;
    res.status(200).send(req.user);
  }
);

// Update User API
app.put(
  "/v1/user/self",
  [
    body("password").notEmpty().withMessage("password is required"),
    body("firstName").notEmpty().withMessage("firstName is required"),
    body("lastName").notEmpty().withMessage("lastName is required"),
    checkExact(),
  ],
  validateRequest,
  authMiddleware,
  async (req, res) => {
    const toUpdate = {};
    toUpdate.password = await bcrypt.hash(req.body.password.toString(), 13);
    toUpdate.first_name = req.body.firstName;
    toUpdate.last_name = req.body.lastName;

    User.update(toUpdate, {
      where: {
        id: req.user.id,
      },
    })
      .then((result) => {
        res.status(204).send();
      })
      .catch((err) => {
        res.status(400).send(err);
      });
  }
);

app.get("/verify/:token", async (req, res) => {
  email_token.findOne({
    where: {
      token: req.params.token
    }
  })
  .then((result) => {
    if (!result) {
      return res.status(401).json({ message: "Token Invalid" });
    }

    const tokenCreationTime = new Date(result.dataValues.created_at).getTime();
    const currentTime = new Date().getTime();
    if (currentTime - tokenCreationTime > 120000) {
      return res.status(401).json({ message: "Token expired" });
    }

    User.update(
      { is_active: true },
      { where: { id: result.dataValues.user_id } }
    )
    email_token.destroy({
      where: {
        token: req.params.token
      }
    })

    res.status(200).json({ message: 'User verified successfully' });
  })
});

// Health APIs
app.get(
  "/healthz",
  [checkExact()],
  validateRequest,
  dbConnCheck,
  async (req, res) => {
    res.setHeader("cache-control", "no-cache, no-store, must-revalidate");
    res.status(200).send();
  }
);

app.post("/healthz", [checkExact()], validateRequest, async (req, res) => {
  res.status(405).send();
});

app.put("/healthz", [checkExact()], validateRequest, async (req, res) => {
  res.status(405).send();
});

app.patch("/healthz", [checkExact()], validateRequest, async (req, res) => {
  res.status(405).send();
});

app.delete("/healthz", [checkExact()], validateRequest, async (req, res) => {
  res.status(405).send();
});

app.head("/healthz", [checkExact()], validateRequest, async (req, res) => {
  res.status(405).send();
});

app.options("/healthz", [checkExact()], validateRequest, async (req, res) => {
  res.status(405).send();
});

app.use(
  expressWinston.errorLogger({
    transports: [
      new transports.File({ filename: logFilePath }),
    ],
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
  })
);

// Starting the server
const server = app.listen(8080, () => {
  logger.info("Server running on port 8080");
});

export default server;