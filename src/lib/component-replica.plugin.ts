
import { combineLatest, ReplaySubject, Subject, Subscription } from 'rxjs';
import { GroupModules, BuilderView, Flux, Property, Schema, RenderView, Component, renderTemplate } from '@youwol/flux-core';
import { pack } from './main'
import { take } from 'rxjs/operators';
import { Replica, ReplicatorModuleBase } from './replication';
import { HTMLElement$, render, VirtualDOM} from '@youwol/flux-view'


export namespace ComponentReplica {
   
    //Icons made by <a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let icon = `<g>
    <path d="m62.755 419.119c-1.143 6.508-1.755 12.252-1.755 16.881 0 41.906 47.103 76 105 76s105-34.094 105-76c0-4.629-.612-10.373-1.755-16.881 5.449 1.242 11.059 1.881 16.755 1.881h45v-15c0-41.355-33.645-75-75-75h-17.58c1.665-4.695 2.58-9.742 2.58-15 0-20.271-13.472-37.455-31.934-43.066-5.611-18.462-22.795-31.934-43.066-31.934s-37.455 13.472-43.066 31.934c-18.462 5.611-31.934 22.795-31.934 43.066 0 5.258.915 10.305 2.58 15h-17.58c-41.458 0-76 33.534-76 75v15h46c5.696 0 11.306-.639 16.755-1.881zm103.245 62.881c-39.953 0-75-21.495-75-46 0-13.712 9.29-48.644 24.437-79.993 6.168 3.183 13.156 4.993 20.563 4.993 11.515 0 22.033-4.347 30-11.486 7.967 7.139 18.485 11.486 30 11.486 7.407 0 14.395-1.81 20.563-4.993 15.147 31.349 24.437 66.281 24.437 79.993 0 24.505-35.047 46-75 46zm132.43-91h-12.43c-9.307 0-18.234-2.813-25.815-8.135-5.792-15.195-8.513-21.765-8.554-21.865h4.369c19.556 0 36.239 12.539 42.43 30zm-162.43-90h15v-15c0-8.271 6.729-15 15-15s15 6.729 15 15v15h15c8.271 0 15 6.729 15 15s-6.729 15-15 15-15-6.729-15-15h-30c0 8.271-6.729 15-15 15s-15-6.729-15-15 6.729-15 15-15zm-60 59.99h4.369c-.041.101-2.727 6.577-8.554 21.875-7.581 5.322-16.508 8.135-25.815 8.135h-13.265c6.474-17.282 23.675-30.01 43.265-30.01z"/><path d="m121 391h30v30h-30z"/><path d="m151 421h30v30h-30z"/><path d="m181 391h30v30h-30z"/><path d="m436 91h-17.58c1.665-4.695 2.58-9.742 2.58-15 0-20.871-13.994-38.352-31.912-43.996-5.59-18.497-22.791-32.004-43.088-32.004s-37.498 13.507-43.088 32.004c-17.908 5.641-31.912 23.114-31.912 43.996 0 5.258.915 10.305 2.58 15h-17.58c-41.355 0-75 33.645-75 75v15h45c5.696 0 11.306-.639 16.755-1.881-1.143 6.508-1.755 12.252-1.755 16.881 0 21.203 11.734 40.703 33.04 54.907 19.436 12.957 44.991 20.093 71.96 20.093s52.524-7.136 71.96-20.093c21.307-14.204 33.04-33.704 33.04-54.907 0-4.629-.612-10.373-1.754-16.881 5.448 1.242 11.058 1.881 16.754 1.881h46v-15c0-20.038-8.022-38.914-22.589-53.153-14.412-14.088-33.381-21.847-53.411-21.847zm-120-31h15v-15c0-8.271 6.729-15 15-15s15 6.729 15 15v15h15c7.99 0 15 7.477 15 16 0 8.271-6.729 15-15 15s-15-6.729-15-15h-30c0 8.271-6.729 15-15 15s-15-6.729-15-15c0-8.523 7.01-16 15-16zm-64.185 82.865c-7.581 5.322-16.508 8.135-25.815 8.135h-12.43c6.191-17.461 22.874-30.01 42.43-30.01h4.369c-.041.101-2.727 6.577-8.554 21.875zm94.185 98.135c-40.654 0-75-20.607-75-45 0-13.712 9.289-48.644 24.437-79.994 6.168 3.184 13.156 4.994 20.563 4.994 11.515 0 22.033-4.347 30-11.486 7.967 7.139 18.485 11.486 30 11.486 7.407 0 14.395-1.81 20.563-4.994 15.148 31.35 24.437 66.282 24.437 79.994 0 24.393-34.346 45-75 45zm120-90c-9.307 0-18.233-2.813-25.814-8.135-5.798-15.21-8.513-21.765-8.554-21.865h4.368c19.59 0 36.791 12.718 43.265 30z"/><path d="m301 151h30v30h-30z"/><path d="m331 181h30v30h-30z"/><path d="m361 151h30v30h-30z"/><path d="m91 151h60v-30h-90v135h30z"/><path d="m451 286h-30v135h-45v30h75z"/>
    </g>`
   
    let defaultGenerator = `
// This function allows you to define the id of a replica.
// It is usefull when one element gets into the plugin: 
//    - if no instance with that id is already included, then the new instance is added
//    - if an instance with same id is already included, then that instance is replaced by the new one 
return ( {data, context, instanceIndex}) => 'replica_'+instanceIndex
`
    @Schema({
        pack
    })
    export class PersistentData {

        @Property({
            description:"Generate the id of the replica",
            type: 'code'
        })
        replicaIdGenerator: string = defaultGenerator


        @Property({
            description:"name of the attribute that conveys replica's context"
        })
        innerContextName: string = 'cell'

        @Property({
            description:"",
            enum:['flex-row', 'flex-column', 'flex-wrap']
        })
        layoutType: string = 'flex-row'

        constructor(params:
            {innerContextName?:string, replicaIdGenerator?:string}={}) {
            Object.assign(this, params)
        }

        getReplicaIdGenerator() : ({data, context, instanceIndex}:{data: any, context: any, instanceIndex: number}) => string {

            return typeof this.replicaIdGenerator == 'string' 
                ? new Function(this.replicaIdGenerator)()
                : this.replicaIdGenerator
        }
    }


    @Flux({
        pack: pack,
        namespace: ComponentReplica,
        id: "ComponentReplica",
        displayName: "ComponentReplica",
        description: "Replicator of group or component",
        compatibility: {
            "required a component or a group": (mdle) => mdle instanceof GroupModules.Module,
        }
    })
    @BuilderView({
        namespace: ComponentReplica,
        icon: icon
    })
    @RenderView({
        namespace: ComponentReplica,
        render: (mdle: Module) => renderHtmlElement(mdle)
    })
    export class Module extends ReplicatorModuleBase {
        
        tabDiv : HTMLDivElement
        subscriptions : Subscription[] = new Array<Subscription>()

        constructor(params) { 
            super( params ) 
        }

        getReplicaId( data: any, config: PersistentData, context: any){
           return config.getReplicaIdGenerator()({data,context,instanceIndex:this.replicas.size}) 
        }

        
        apply(){
            super.apply()
            this.subscriptions.push(
                this.componentDiv$.subscribe( componentDiv => {
                    componentDiv.classList.add("flux-builder-only")
                    componentDiv.style.setProperty('opacity','0.5')
                })
            )
        }

        dispose(){
            super.dispose()
            this.componentDiv$.pipe(
                take(1)
            ).subscribe( (componentDiv) => {
                componentDiv.style.setProperty('opacity','1') 
                componentDiv.classList.remove("flux-builder-only")
            })
            this.subscriptions.forEach( s => s.unsubscribe() )
        }
    }

    //-------------------------------------------------------------------------
    //-------------------------------------------------------------------------

    function renderHtmlElement(mdle: Module){

        let container$ = new ReplaySubject<HTMLElement>()
        
        let sub = combineLatest([container$, mdle.newInstance$])
        .subscribe( ([container, replica]: [HTMLElement, Replica]) => {
            
            let component = replica.rootComponent as Component.Module
            let templateHTML = component.getHTML({recursive:false})
            let divContent = renderTemplate(templateHTML, replica.rootComponent.getDirectChildren())
    
            divContent.id = replica.rootComponent.moduleId
            divContent.classList.add("flux-element", "replica", mdle.parentModule.moduleId)
            divContent.classList.remove("flux-builder-only")

            console.log("TEMPLATE GENERATED "+mdle.parentModule.configuration.title, {module:mdle})

            divContent.style.setProperty('opacity','1')
            mdle.registerView(divContent)
            container.appendChild(divContent)
        })

        let virtualDOM : VirtualDOM = {
            connectedCallback: (elem: HTMLDivElement & HTMLElement$) => {
                console.log("VIEW PLUGIN INSTALLED "+mdle.parentModule.configuration.title, {module:mdle})
                container$.next(elem.parentElement.parentElement)
                elem.ownSubscriptions(sub)
            }
        }

        return render(virtualDOM)
    }
}