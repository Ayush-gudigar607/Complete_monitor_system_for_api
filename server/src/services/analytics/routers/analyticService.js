import express from "express";
import analyticsContainer from "../Dependencies/dependencies.js";
import { AnalyticController } from "../controller/analyticCotroller.js";
import authenticate from "../../../shared/middlewares/authenticate.js";

const router = express.Router();

const { controllers } = analyticsContainer;

const analyticController = controllers.analyticController;

router.get(
  "/status",
  authenticate,
  (req,res,next)=>
  {
    analyticController.getStatus(req,res,next)
  })

router.get("/dashboard", authenticate, (req, res, next) => {
  analyticController.getDashboard(req, res, next);
});

export default router;