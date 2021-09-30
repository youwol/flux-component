import { Component, ConfigurationAttributes, duplicateWorkflow, freeContract, GroupModules, InputSlot, Message, ModuleConfiguration, PluginFlux, renderTemplate, SideEffects, SubscriptionStore, toCssName, Workflow } from "@youwol/flux-core"
import { Context } from "node:vm"
import { ReplaySubject, Subscription } from "rxjs"


export class Replica{

    public readonly replicaId: string
    public readonly rootComponent: GroupModules.Module
    public readonly workflow: Workflow
    public readonly subscriptionsStore : SubscriptionStore

    public readonly incomingMessage: Message

    constructor({replicaId, rootComponent, workflow, subscriptionsStore, incomingMessage}:{ 
            replicaId : string,
            rootComponent: GroupModules.Module,
            workflow: Workflow,
            subscriptionsStore : SubscriptionStore
            incomingMessage: Message
        } ){
        this.replicaId = replicaId
        this.rootComponent = rootComponent
        this.incomingMessage = incomingMessage
        this.workflow = workflow
        this.subscriptionsStore = subscriptionsStore
    }

    innerContext() : {[key:string]: any} {
        return {}
    }

}

export abstract class ReplicatorModuleBase 
extends PluginFlux<Component.Module> 
implements SideEffects {

    /**
     * When the templated component is rendered 
     */
    componentDiv$ : ReplaySubject<HTMLDivElement>

    replicas = new Map<string, Replica>()
    subscriptions = new Array<Subscription>()
    registeredViews = new Array<HTMLElement>()

    replayedInstance$ = new ReplaySubject<Replica>()
    newInstance$ = new ReplaySubject<Replica>()


    constructor(params) {
        super(params)
        this.parentModule.getExplicitInputs().forEach((inputSlot: InputSlot, i: number) => {
            this.addInput({
                id: "dispatch_" + inputSlot.slotId,
                contract: freeContract(),
                onTriggered : ({data, configuration, context}) => this.dispatchOrCreate(i, data, configuration, context)
            })
        })
        this.componentDiv$ = this.parentModule.renderedElementDisplayed$

    }

    abstract getReplicaId(data, config, context)

    
    registerView(element: HTMLElement){
        this.registeredViews.push(element)
    }

    dispatchOrCreate(indexSlot, data, config: any, context) {

        /*
        if(Array.isArray(data) ){
            
            let replicaIds = data.map( d => {
                return toCssName(this.getReplicaId(d, config, context)) 
            })
            let toRemove = Array.from(this.replicas.keys()).filter( k => !replicaIds.includes(k))

            toRemove.forEach( replicaId => {
                let replica = this.replicas.get(replicaId)
                replica.component['_workflow'] && replica.component['_workflow'].subscriptionsStore.clear()
                replica.component.disposeChildrenSideEffects()
                this.replicas.delete(replicaId)
            })
            
            let replicas = data.map( d => {
                let replicaId = toCssName(this.getReplicaId(d, config, context))
                let replica = this.replicas.has(replicaId) 
                    ? this.replicas.get(replicaId)
                    : this.newReplica(replicaId,data, config, context)

                let newContext = { ...context, ...replica.innerContext()}
                replica.component.internalEntries[indexSlot].next({ data:d, configuration: {}, context: newContext })
                this.replicas.set(replica.replicaId, replica)
                return replica
            })
            this.setInstances$.next(replicas)
            return
        }
        */
        let replicaId = toCssName(this.getReplicaId(data, config, context))

        let replica = this.replicas.get(replicaId) 
            ? this.replicas.get(replicaId) 
            : this.newReplica(indexSlot, replicaId, data, config, context)

        let newContext = { ...context, ...replica.innerContext()}
        console.log("Replica plugin: SEND DATA", { data, context })
        replica.rootComponent.internalEntries[indexSlot].next({ data, configuration: {}, context: newContext })
        //this.parentModule.internalEntries[indexSlot].next({ data, configuration: {}, context: newContext })

        if (!this.replicas.get(replicaId)) {
            this.replicas.set(replicaId, replica)
            this.newInstance$.next(replica)
            return
        }
        this.replayedInstance$.next(replica)
    }

    apply(){
    }

    dispose(){

        this.registeredViews.forEach( view => view.remove())
        
        this.replicas.forEach( (replica: Replica) => {
            replica.subscriptionsStore.clear()
            replica.rootComponent.disposeChildrenSideEffects()
        })
    }

    newReplica(indexSlot: number, replicaId: string, data: unknown, configuration: ConfigurationAttributes, context: Context) : Replica {
        
        let { rootComponent, workflow, subscriptionsStore } = duplicateWorkflow({
            rootComponent:this.parentModule, 
            name: replicaId,
            indexEntryPoint: indexSlot
        })
        
        let replica = new Replica({
            replicaId,
            workflow,
            rootComponent,
            incomingMessage:{data,configuration,context},
            subscriptionsStore 
        })
        console.log("!!!!!!!!!!!!!!newReplica!!!!!!"+rootComponent.moduleId, replica)
        return replica
    }
}
