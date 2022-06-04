import { Injectable } from "@angular/core";
import { AbstractGenericCrudService } from "../../../core/service/generic-crud.service";
import { Product } from "../model/product.model";
import { HttpClient, HttpErrorResponse, HttpParams } from "@angular/common/http";
import { ErrorNotificationService } from "../../../core/service/error-notification.service";
import { ProductResultRepository } from "./product-result.repository";
import { catchError, Observable, tap, throwError } from "rxjs";
import { FacetPage } from "../model/facet-page.model";
import { Page } from "../../../core/model/page.model";
import { PageRequest } from "../../../core/model/page-request.model";
import { defaultPageRequest } from "../../../core/constant/default-page-request";

export interface FilterOption {
  categoryFilter?: string,
  brandFilter?: string,
  priceFilter?: string,
  ratingFilter?: number,
  attributeFilter?: string,
}

export const initialFilterOption: FilterOption = {
  categoryFilter: "",
  brandFilter: "",
  priceFilter: "",
  ratingFilter: 1,
  attributeFilter: "",
};

@Injectable({
  providedIn: "root",
})
export class ProductService extends AbstractGenericCrudService<Product, string> {

  constructor(
    protected override http: HttpClient,
    private errorNotificationService: ErrorNotificationService,
    private productResultRepository: ProductResultRepository,
  ) {
    super(http, "/products", {
      readOne: false,
      readAll: false,
      readPage: false,
      create: false,
      update: false,
      delete: false,
    });
  }

  private readonly searchUrl = "";
  private readonly autoCompleteUrl = "/auto-complete";
  private readonly similarProductSearchUrl = "/similar-products";

  protected override handleError(errorResponse: HttpErrorResponse): Observable<never> {
    this.errorNotificationService.open(errorResponse);
    return throwError(() => errorResponse);
  }

  autoComplete(searchText: string): Observable<Array<string>> {
    const url = this.entityUrl + this.autoCompleteUrl;
    let httpParams = new HttpParams();
    httpParams = httpParams.append("searchText", searchText);
    return this.http
      .get<Array<string>>(url, { ...this.httpOptions, params: httpParams })
      .pipe(catchError(errorResponse => this.handleError(errorResponse)));
  }

  searchSimilarProduct(searchText: string,
                       pageRequest: PageRequest = defaultPageRequest): Observable<Page<Product>> {
    const url = this.entityUrl + this.similarProductSearchUrl;
    let httpParams = new HttpParams();
    httpParams = httpParams.append("searchText", searchText);
    httpParams = this.buildPaginationParams(pageRequest, httpParams);
    return this.http
      .get<Page<Product>>(url, { ...this.httpOptions, params: httpParams })
      .pipe(catchError(errorResponse => this.handleError(errorResponse)));
  }

  search(searchText: string, pageRequest: PageRequest = defaultPageRequest, filterOption?: FilterOption) {
    const url = this.entityUrl + this.searchUrl;
    let httpParams = new HttpParams();
    httpParams = httpParams.append("searchText", searchText);
    httpParams = this.buildPaginationParams(pageRequest, httpParams);
    if (filterOption) {
      httpParams = this.buildFilterParams(filterOption, httpParams);
    }
    this.http.get<FacetPage<Product>>(url, { ...this.httpOptions, params: httpParams })
      .pipe(
        tap(resultPage => this.productResultRepository.setProductResultPage(resultPage)),
        catchError(errorResponse => this.handleError(errorResponse)),
      ).subscribe();
  }

  protected buildPaginationParams(pageRequest: PageRequest, httpParams: HttpParams): HttpParams {
    httpParams = httpParams.append("size", pageRequest.size);
    httpParams = httpParams.append("page", pageRequest.page);
    if (pageRequest.sort) {
      for (let sortValue of pageRequest.sort) {
        httpParams = httpParams.append("sort", sortValue);
      }
    }

    return httpParams;
  }

  protected buildFilterParams(filterOption: FilterOption, httpParams: HttpParams): HttpParams {
    if (filterOption.categoryFilter) {
      httpParams = httpParams.append("categoryFilter", filterOption.categoryFilter);
    }
    if (filterOption.brandFilter) {
      httpParams = httpParams.append("brandFilter", filterOption.brandFilter);
    }
    if (filterOption.priceFilter) {
      httpParams = httpParams.append("priceFilter", filterOption.priceFilter);
    }
    if (filterOption.ratingFilter) {
      httpParams = httpParams.append("ratingFilter", filterOption.ratingFilter);
    }
    if (filterOption.attributeFilter) {
      httpParams = httpParams.append("attributeFilter", filterOption.attributeFilter);
    }

    return httpParams;
  }

  slugify(text: string): string {
    return text
      .toString()
      .normalize("NFD") // split an accented letter in the base letter and the accent
      .replace(/[\u0300-\u036f]/g, "")  // remove all previously split accent
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-") // replace spaces with "-"
      .replace(/[^\w-]+/g, "") // remove non-word
      .replace(/--+/g, "-"); // replace more than one dashes with one dash
  }
}
