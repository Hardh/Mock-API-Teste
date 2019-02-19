import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CartaoPesquisa } from 'app/core/ciee-vagas/cartao/cartao-pesquisa.model';
import { CacheDataService } from 'app/core/ciee-vagas/cache-data/cache-data.service';
import { CandidatoSelecionadoService } from 'app/core/ciee-vagas/candidato-selecionado/candidato-selecionado.service';

@Component({
  selector: 'app-lista-candidatos-estagio',
  templateUrl: './lista-candidatos-estagio.component.html',
  styleUrls: ['./lista-candidatos-estagio.component.scss']
})
export class ListaCandidatosEstagioComponent implements OnInit {

  @Input() candidato: CartaoPesquisa;
  @Input() tipoUsuarioLogado: 'backOfficePCDVagas' | 'backOfficeEmpresa' | 'backOfficeVagas' | 'admin' | null = null;
  @Input() perfilCandidato: string;
  @Output() favoritarCandidatoEmitter: EventEmitter<void> = new EventEmitter<void>();
  @Output() selecionar: EventEmitter<CartaoPesquisa> = new EventEmitter<CartaoPesquisa>();
  @Output() comparar: EventEmitter<CartaoPesquisa> = new EventEmitter<CartaoPesquisa>();
  @Output() visualizar: EventEmitter<CartaoPesquisa> = new EventEmitter<CartaoPesquisa>();
  public expandir: boolean;
  public podeExpandir: boolean;
  public isLoading: boolean;

  constructor(
    private cacheDataService: CacheDataService,
    private candidatoSelecionadoService: CandidatoSelecionadoService
  ) { }

  ngOnInit() {
    this.isLoading = false;
    this.expandir = false;
  }

  get nivelPerfil() {
    if (!this.tipoUsuarioLogado) {
      return 0;
    }
    if (this.tipoUsuarioLogado === 'backOfficeEmpresa') {
      return 1;
    }
    if (this.tipoUsuarioLogado === 'backOfficeVagas') {
      return 2;
    }
    if (this.tipoUsuarioLogado === 'backOfficePCDVagas') {
      return 3;
    }
    if (this.tipoUsuarioLogado === 'admin') {
      return 4;
    }
  }

  selecionarCandidato(objeto: CartaoPesquisa): void {
    this.selecionar.emit(objeto);
  }

  compararCandidato(objeto: CartaoPesquisa): void {
    this.comparar.emit(objeto);
  }

  visualizarCandidato(objeto: CartaoPesquisa): void {
    this.visualizar.emit(objeto);
  }

  favoritar(candidato: CartaoPesquisa) {
    this.favoritarCandidatoEmitter.emit();
    this.cacheDataService.adicionarFavoritos(candidato);
  }

  public favorito() {
    return this.cacheDataService.obterListaFavoritos().findIndex(elemento => elemento.id === this.candidato.id) > -1;
  }

  expandirRecolher() {
    if (this.expandir) {
      this.expandir = false;
    } else {
      this.candidatoSelecionadoService.obterCandidatoPorId(this.candidato.id)
        .subscribe(candidato => {
          this.candidato = <any>candidato;
          this.expandir = true;
        });
    }
  }

  get equipamento(): string {
    return (
      this.candidato &&
      this.candidato.recursoAcessibilidades &&
      this.candidato.recursoAcessibilidades[0] &&
      this.candidato.recursoAcessibilidades[0]['equipamento']
    ) ?
      this.candidato.recursoAcessibilidades[0]['equipamento'] : '';
  }

  get contato(): string {
    return (
      this.candidato &&
      this.candidato.contatos &&
      this.candidato.contatos['emails'] &&
      this.candidato.contatos['emails'][0] &&
      this.candidato.contatos['emails'][0]['email']
    ) ?
      this.candidato.contatos['emails'][0]['email'] : '';
  }

}
