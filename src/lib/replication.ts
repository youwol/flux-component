import { Component, ConfigurationAttributes, duplicateWorkflow$, freeContract, GroupModules, InputSlot, instanceOfSideEffects, Message, ModuleConfiguration, PluginFlux, renderTemplate, SideEffects, SubscriptionStore, toCssName, Workflow } from "@youwol/flux-core"
import { Context } from "node:vm"
import { Observable, of, ReplaySubject, Subscription } from "rxjs"
import { map } from "rxjs/operators"


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
    registeredViews = new Map<string, HTMLElement>()

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

    
    registerView(replicaId: string, element: HTMLElement){
        this.registeredViews.set(replicaId, element)
    }

    dispatchOrCreate(indexSlot, data, config: any, context) {

        // When new data arrives...
        
        let replicaId = toCssName(this.getReplicaId(data, config, context))

        // Case 1 : a replica with replicaId already exists => we use it

        if(this.replicas.has(replicaId) ){
            let replica = this.replicas.get(replicaId) 
            let newContext = { ...context, ...replica.innerContext()}
            replica.rootComponent.internalEntries[indexSlot].next({ data, configuration: {}, context: newContext })
            return
        }

        // Case 2: it does not exist yet

        let sub = this.newReplica$(indexSlot, replicaId, data, config, context).
        subscribe( (replica:Replica) => {
            // This is executed: (i) at first creation of one replica, and (ii) when an 'indirect'
            // change of the parent module is triggered (workflowDistinct$ has been updated due to changes in a group-module
            // child of this.parentModule)
            let newContext = { ...context, ...replica.innerContext()}

            if(this.replicas.has(replicaId) ){ 
                // it is a workflow reconstruction of 'indirect changes'
                this.deleteReplica(replicaId)
            }
            replica.rootComponent.internalEntries[indexSlot].next({ data, configuration: {}, context: newContext })
            this.replicas.set(replicaId, replica)
            this.newInstance$.next(replica)
            this.replayedInstance$.next(replica)
        })
        this.subscriptions.push(sub)
    }

    apply(){
    }

    dispose(){

        [...this.registeredViews.values()].forEach( view => view.remove())
        
        this.replicas.forEach( (replica: Replica) => {
            replica.subscriptionsStore.clear()
            replica.rootComponent.disposeChildrenSideEffects(replica.rootComponent._workflow)
        })

        this.subscriptions.forEach( s => s.unsubscribe() )
    }

    deleteReplica(replicaId: string){
        this.registeredViews.get(replicaId).remove()
        this.registeredViews.delete(replicaId)
        let replica = this.replicas.get(replicaId)
        // remove subscriptions due to connections
        replica.subscriptionsStore.clear();
        // remove side effects of modules
        [...replica.workflow.modules, ...replica.workflow.plugins]
        .filter(m => instanceOfSideEffects(m))
        .forEach( (m: any) => m.apply())

        this.replicas.delete(replicaId)
    }

    newReplica$(
        indexSlot: number,
        replicaId: string, 
        data: unknown, 
        configuration: ConfigurationAttributes, 
        context: Context) : Observable<Replica> {
        
        return duplicateWorkflow$({
            rootComponent:this.parentModule, 
            name: replicaId,
            indexEntryPoint: indexSlot
        }).pipe(
            map( ({ rootComponent, workflow, subscriptionsStore }) => {
                let replica = new Replica({
                    replicaId,
                    workflow,
                    rootComponent,
                    incomingMessage:{data,configuration,context},
                    subscriptionsStore 
                })
                return replica
            })
        )
    }
}


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