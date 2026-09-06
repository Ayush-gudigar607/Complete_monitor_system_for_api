export default class BaseClientRepository {
    constructor(model) {
        if (!model) {
            throw new Error("Model is required");
        }
        this.model = model;
    }
        // Define the methods that will be implemented by the subclasses
        async create(clientData)
        {
            throw new Error("Method not implemented");  
        }

        //This method will find a client by its ID and return the client object if found, otherwise it will return null
        async findById(clientId)
        {
            throw new Error("Method not implemented");
        }
         
        //This method will find a client by its slug and return the client object if found, otherwise it will return null
        async findBySlug(slug)
        {
            throw new Error("Method not implemented");
        }
        
        //This method will find a client by its name and return the client object if found, otherwise it will return null
        async find(filters,options)
        {
            throw new Error("Method not implemented");
        }
        
        //This method will count the number of clients that match the provided filters and return the count
        async count(filters)
        {
            throw new Error("Method not implemented");
        }

    }
