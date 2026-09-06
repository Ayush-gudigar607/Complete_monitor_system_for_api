import express from "express";
import authenticate from "../../../shared/middlewares/authenticate.js";
import ResponceFormatter from "../../../shared/utils/ResponceFormatter.js";
import Clientdependencies from "../Dependencies/dependencies.js";

const router = express.Router();
const {clientController}=Clientdependencies.controllers;

router.get("/", (req, res) => {
  console.log("GET /api/client HIT");
  return res.status(200).json(
    ResponceFormatter.success(
      {
        service: "Client Management",
        endpoints: [
          {
            path: "/api/admin/client/onboard",
            method: "POST",
          },
          {
            path: "/api/admin/client/:clientId/users",
            method: "POST",
          },
          {
            path: "/api/admin/client/:clientId/api-keys",
            method: "POST",
          },
          {
            path: "/api/admin/client/:clientId/api-keys",
            method: "GET",
          },
        ],
      },
      "Client Management endpoints available",
    ),
  );
});

//This router will handle all the client related routes
router.use(authenticate);

router.get("/admin/clients", (req, res, next) => clientController.listClients(req, res, next));

router.get("/admin/client", (req, res, next) => clientController.listClients(req, res, next));


router.post("/admin/client/onboard", async (req, res, next) => {
  clientController.createClient(req, res, next);
});

router.post("/admin/client/:clientId/users", (req, res, next) =>
  clientController.createClientUser(req, res, next),
);

router.post("/admin/client/:clientId/api-keys", (req, res, next) =>
  clientController.createApiKey(req, res, next),
);

router.get("/admin/client/:clientId/api-keys", (req, res, next) =>
  clientController.getApiKeys(req, res, next),
);
router.patch("/admin/client/:clientId/api-keys/:keyId", (req, res, next) =>
  clientController.updateApiKey(req, res, next),
);
router.delete("/admin/client/:clientId/api-keys/:keyId", (req, res, next) =>
  clientController.deleteApiKey(req, res, next),
);

router.patch("/admin/client/:clientId", (req, res, next) =>
  clientController.updateClient(req, res, next),
);
router.patch("/admin/client/:clientId/status", (req, res, next) =>
  clientController.setClientActive(req, res, next),
);
router.delete("/admin/client/:clientId", (req, res, next) =>
  clientController.deleteClient(req, res, next),
);
router.post("/admin/client/:clientId/api-keys/:keyId/revoke", (req, res, next) =>
  clientController.revokeApiKey(req, res, next),
);
router.post("/admin/client/:clientId/api-keys/:keyId/rotate", (req, res, next) =>
  clientController.rotateApiKey(req, res, next),
);
router.post("/admin/client/:clientId/services", (req, res, next) =>
  clientController.createMonitoringService(req, res, next),
);
router.get("/admin/client/:clientId/services", (req, res, next) =>
  clientController.listMonitoringServices(req, res, next),
);
router.patch("/admin/client/:clientId/services/:serviceId/status", (req, res, next) =>
  clientController.setMonitoringServiceActive(req, res, next),
);
router.delete("/admin/client/:clientId/services/:serviceId", (req, res, next) =>
  clientController.deleteMonitoringService(req, res, next),
);

export default router;
