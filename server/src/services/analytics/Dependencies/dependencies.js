import clientRepository from "../../client/repository/ClientRepository.js";
import processContainer from "../../processor/dependencies/dependencies.js";
import authContainer from "../../auth/dependencies/Dependencies.js";

import {AnalyticsService} from "../services/analyticsService.js";
import {AnalyticController} from "../controller/analyticCotroller.js";


class container
{
    static init()
    {
        const repositories={
            cllientRepository:clientRepository,
            metricsRepository:processContainer.repositories.metricsRepository
        }

        const analyticsService=new AnalyticsService({
            metricsRepository:repositories.metricsRepository
        });

        const services={
            analyticsService:analyticsService,
            authService:authContainer.services && authContainer.services.authService,
        }

        const analyticContainer=new AnalyticController({
            analyticsService:services.analyticsService,
            authService:services.authService,
            clientRepository:repositories.cllientRepository
        });

        const controllers={
            analyticController:analyticContainer
        }

        return {
            repositories:repositories,
            services:services,
            controllers:controllers
        }
    }
}

const initialized=container.init();
export {container};
export default initialized;
