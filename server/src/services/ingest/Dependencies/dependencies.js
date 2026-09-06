import {createEventProducer} from "../../../shared/events/producer/createEventProducer.js";
import {IngestController} from "../controllers/ingestController.js";
import {ingestService} from "../services/ingestservice.js";

class Container
{
    static init()
    {
        const eventProducer=createEventProducer();

        const services={
            ingestService:new ingestService({eventProducer})
        }

        const controllers={
            ingestController:new IngestController({ingestService:services.ingestService})
        }

        return {
            services,
            controllers
        }
    }
}

const container=Container.init();
export default {
    ingestService:container.services.ingestService,
    ingestController:container.controllers.ingestController,
    Container
}

