import express from "express";
import sequelize from "./config/database.js";
import User from "./models/User.js";
import bcrypt from "bcrypt";
import { body, checkExact, validationResult } from "express-validator";

// Database connection
const initApp = async () => {
  console.log("Testing the database connection...");
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");

    await User.sync({ alter: true });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

initApp();

// APIs
const app = express();
app.use(express.json());

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
  "/create-user",
  [
    body("email").notEmpty().withMessage("email is required").bail().isEmail(),
    body("password").notEmpty().withMessage("password is required"),
    body("firstName").notEmpty().withMessage("firstName is required"),
    body("lastName").notEmpty().withMessage("lastName is required"),
  ],
  validateRequest,
  dbConnCheck,
  async (req, res) => {
    const hash = await bcrypt.hash(req.body.password.toString(), 13);

    User.create({
      email: req.body.email,
      password: hash,
      first_name: req.body.firstName,
      last_name: req.body.lastName,
    })
      .then((result) => {
        delete result.dataValues.password;
        res.status(201).send(result);
      })
      .catch((err) => {
        res.status(400).send(err);
      });
  }
);

// Get User API
app.get(
  "/get-user",
  [checkExact()],
  validateRequest,
  dbConnCheck,
  authMiddleware,
  async (req, res) => {
    delete req.user.password;
    res.status(200).send(req.user);
  }
);

// Update User API
app.put(
  "/update-user",
  [
    body("password").notEmpty().withMessage("password is required"),
    body("firstName").notEmpty().withMessage("firstName is required"),
    body("lastName").notEmpty().withMessage("lastName is required"),
    checkExact(),
  ],
  validateRequest,
  dbConnCheck,
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

// Starting the server
app.listen(8080, () => {
  console.log("Server running on port 8080");
});
