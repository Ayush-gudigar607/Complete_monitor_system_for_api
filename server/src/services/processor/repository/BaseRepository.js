export class BaseRepository {
    constructor({logger:l=console}={})
    {
        this.logger=l;
    }

    //Implementation of the create method to be used by the child classes
    async create()
    {
        throw new Error("Method not implemented");
    }

    async find()
    {
        throw new Error("Method not implemented");
    }

    async count()
    {
        throw new Error("Method not implemented");
    }

    async deleteOldHits()
    {
        throw new Error("Method not implemented");
    }
}