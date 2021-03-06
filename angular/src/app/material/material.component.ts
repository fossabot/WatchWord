import {NgForm, NgModel} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Component, OnInit, OnDestroy, Injector} from '@angular/core';
import {ISubscription} from 'rxjs/Subscription';
import {MaterialMode, MaterialStats} from './material.models';
import {VocabWordFiltration} from './material.models';
import {TranslationModalService} from '../global/components/translation-modal/translation-modal.service';
import {ComponentValidation} from '../global/component-validation';
import {AppComponentBase} from '@shared/app-component-base';
import {Word, Material, VocabWord} from 'shared/service-proxies/service-proxies';
import {MaterialServiceProxy, FavoriteMaterialServiceProxy} from 'shared/service-proxies/service-proxies';
import {AppEnums} from '@shared/AppEnums';

@Component({
    templateUrl: 'material.template.html'
})
export class MaterialComponent extends AppComponentBase implements OnInit, OnDestroy {

    public mode: MaterialMode = null;
    public vocabWords: VocabWord[] = [];
    public material: Material = new Material();
    public isFavorite = false;
    public formSubmitted: boolean;
    public filtration: VocabWordFiltration = new VocabWordFiltration();
    public batchSelect: boolean;

    private routeSubscription: ISubscription;
    private translationModalResponseSubscription: ISubscription;

    private static pushStatToStats(stats: MaterialStats[], name: string, value: string) {
        stats.push({
            name: name,
            value: value
        });
    }

    public static validationErrors(state: NgModel): string[] {
        return ComponentValidation.validationErrors(state);
    }

    constructor(private materialService: MaterialServiceProxy,
                private route: ActivatedRoute,
                private router: Router,
                private favoriteMaterialsService: FavoriteMaterialServiceProxy,
                private translationModalService: TranslationModalService,
                injector: Injector) {
        super(injector);
    }

    ngOnInit() {
        this.routeSubscription = this.route.params.subscribe(params => this.onRouteChanged(params['id']));
        this.translationModalResponseSubscription = this.translationModalService.translationModalResponseObservable
            .subscribe(vocabWord => {
                this.translationModalService.updateVocabWordInCollection(vocabWord, this.vocabWords);
            });
    }

    public saveMaterial(form: NgForm): void {
        this.formSubmitted = true;
        if (form.valid) {
            abp.ui.setBusy();

            this.material.words = this.vocabWords.map((vocabWord) => {
                const word = new Word();
                word.id = 0;
                word.theWord = vocabWord.word;
                word.count = this.material.words.find(w => w.theWord === vocabWord.word).count;

                return word;
            });

            this.materialService.save(this.material)
                .finally(() => {
                    abp.ui.clearBusy();
                    this.formSubmitted = false;
                })
                .subscribe((response) => {
                    if (this.mode === MaterialMode.Add) {
                        this.router.navigateByUrl('app/material/' + response.id).then();
                    } else {
                        this.mode = MaterialMode.Read;
                    }
                });
        }
    }

    public editMaterial(): void {
        this.mode = MaterialMode.Edit;
    }

    public deleteMaterial(): void {
        abp.ui.setBusy();
        this.materialService.delete(this.material.id).subscribe(() => {
            abp.ui.clearBusy();
            this.router.navigateByUrl('app/materials').then();
        });
    }

    public markMultiplyAsKnown(): void {
        this.batchSelect = true;
    }

    public cancelMultiply(): void {
        this.batchSelect = false;
    }

    get materialStats(): MaterialStats[] {
        const stats: MaterialStats[] = [];

        const totalCount = this.material.words
            .map(w => w.count).reduce((pre, curr) => pre + curr, 0);

        const uniqueCount = this.vocabWords.length;
        MaterialComponent.pushStatToStats(stats, 'Total words', totalCount.toString());
        MaterialComponent.pushStatToStats(stats, 'Unique words', uniqueCount.toString());

        if (this.appSession.user && this.appSession.user.id) {
            const learnCount = this.vocabWords.filter(v => v.type === AppEnums.VocabType.LearnWord).length;
            const knownCount = this.vocabWords.filter(v => v.type === AppEnums.VocabType.KnownWord).length;

            MaterialComponent.pushStatToStats(stats, 'Learn words', learnCount.toString());
            MaterialComponent.pushStatToStats(stats, 'Known words', knownCount.toString());
            MaterialComponent.pushStatToStats(stats, 'Unsigned words', (uniqueCount - (learnCount + knownCount)).toString());
        }

        return stats;
    }

    get isEditButtonsVisible(): boolean {
        if (!this.appSession.userId || !this.material.owner) {
            return false;
        }

        const isAdmin = this.isGranted('Admin');
        return this.material.owner.id === this.appSession.userId || isAdmin;
    }

    get isAddToFavoritesButtonVisible(): boolean {
        return !(!this.material.id || !this.appSession.userId || this.mode === MaterialMode.Add);
    }

    public addToFavorites(): void {
        abp.ui.setBusy();
        this.favoriteMaterialsService.post(this.material.id)
            .finally(() => abp.ui.clearBusy())
            .subscribe(() => this.isFavorite = !this.isFavorite);
    }

    public removeFromFavorites(): void {
        abp.ui.setBusy();
        this.favoriteMaterialsService.delete(this.material.id)
            .finally(() => abp.ui.clearBusy())
            .subscribe(resp => this.isFavorite = !this.isFavorite);
    }

    private onRouteChanged(param: string): void {
        if (param === 'create') {
            this.mode = MaterialMode.Add;
            this.material = new Material();
            this.vocabWords = [];
        } else if (+param) {
            this.initializeMaterial(+param);
        } else {
            this.router.navigate(['app/404']).then();
        }
    }

    private initializeMaterial(id: number): void {
        abp.ui.setBusy();

        this.materialService.getMaterial(id).subscribe(response => {
            this.mode = MaterialMode.Read;
            this.material = response.material;
            this.vocabWords = response.vocabWords;

            if (this.appSession.getShownLoginName()) {
                this.favoriteMaterialsService.get(this.material.id)
                    ._finally(() => abp.ui.clearBusy())
                    .subscribe(isFavorite => this.isFavorite = isFavorite);
            } else {
                abp.ui.clearBusy();
            }
        });
    }

    ngOnDestroy() {
        this.routeSubscription.unsubscribe();
        this.translationModalResponseSubscription.unsubscribe();
    }
}
