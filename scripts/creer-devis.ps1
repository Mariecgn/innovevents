<#
.SYNOPSIS
    Crée un événement et un devis (PDF) pour un client existant, via l'API Innov'Events.

.DESCRIPTION
    Étapes : connexion administrateur, recherche du client (par e-mail), création de
    l'événement, création du devis (lignes HT, TVA 20 %, TTC), génération du PDF, puis
    (en option) passage du devis au statut « envoyé » (ETUDE_CLIENT).

    - Rien n'est écrit dans la base avant votre confirmation.
    - Le PDF est créé par le serveur : backend\generated\devis-<numéro>.pdf
    - L'envoi d'e-mail est simulé par le backend : aucun e-mail ne part réellement.
    - Le mot de passe est saisi de façon masquée ; ni lui ni le jeton ne sont affichés.

.EXAMPLE
    .\scripts\creer-devis.ps1

.EXAMPLE
    .\scripts\creer-devis.ps1 -ClientEmail julesvernes@gmail.com -Envoyer
#>
param(
    [string]$Api = 'http://localhost:3000/api',
    [string]$ClientEmail = 'julesvernes@gmail.com',
    [string]$AdminEmail,
    [System.Security.SecureString]$AdminPassword,
    [switch]$Envoyer,
    [switch]$SansOuvrir,
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'

# ---- À ADAPTER : lignes du devis (montants en euros, hors taxes) -------------------
$Lignes = @(
    @{ label = 'Location de la salle (journée)';    amount_ht = 1500 },
    @{ label = 'Restauration (déjeuner et pauses)'; amount_ht = 2400 },
    @{ label = 'Technique et animation';            amount_ht = 900 }
)
# -------------------------------------------------------------------------------------

function Invoke-Api {
    param([string]$Method, [string]$Path, $Body, [string]$Token)

    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }

    $params = @{ Uri = "$Api$Path"; Method = $Method; Headers = $headers; TimeoutSec = 20; UseBasicParsing = $true }

    if ($null -ne $Body) {
        $params['ContentType'] = 'application/json; charset=utf-8'
        $params['Body'] = [System.Text.Encoding]::UTF8.GetBytes(($Body | ConvertTo-Json -Depth 6))
    }

    try {
        $response = Invoke-WebRequest @params
        if ($response.Content) { return ($response.Content | ConvertFrom-Json) }
        return $null
    } catch {
        $status = 0
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }

        $message = $_.ErrorDetails.Message
        try { $message = ($message | ConvertFrom-Json).message } catch { }
        if (-not $message) { $message = $_.Exception.Message }

        if ($status -eq 0) {
            throw "Serveur injoignable sur $Api. Le backend est-il démarré (npm start dans backend\) ?"
        }

        throw "L'API a refusé la requête ($Method $Path) : HTTP $status - $message"
    }
}

function ConvertTo-LocalDate($value) {
    if ($null -eq $value) { return $null }
    try {
        if ($value -is [datetime]) { return $value.ToLocalTime().ToString('yyyy-MM-dd') }
        return ([DateTimeOffset]::Parse([string]$value)).ToLocalTime().ToString('yyyy-MM-dd')
    } catch {
        return $null
    }
}

function Confirm-Action($question) {
    if ($Yes) { return $true }
    $answer = Read-Host "$question (o/N)"
    return ($answer -match '^(o|oui|y|yes)$')
}

try {
    Write-Host ''
    Write-Host "=== Devis Innov'Events pour $ClientEmail ===" -ForegroundColor Cyan

    # 1. Connexion administrateur
    if (-not $AdminEmail) { $AdminEmail = Read-Host 'E-mail administrateur' }
    if (-not $AdminPassword) { $AdminPassword = Read-Host 'Mot de passe' -AsSecureString }

    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AdminPassword)
    try {
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        $login = Invoke-Api 'POST' '/auth/login' @{ email = $AdminEmail; password = $plain }
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        $plain = $null
    }

    $token = $login.token
    if ($login.user.role -ne 'ADMIN') {
        throw "Ce compte n'est pas administrateur (rôle : $($login.user.role))."
    }
    Write-Host "Connecté : $($login.user.firstname) (ADMIN)" -ForegroundColor Green

    # 2. Fiche client
    $client = Invoke-Api 'GET' '/clients' $null $token |
        Where-Object { $_.email -ieq $ClientEmail } |
        Select-Object -First 1

    if (-not $client) {
        throw "Aucune fiche client avec l'e-mail $ClientEmail. Convertissez d'abord le prospect dans le tableau de bord."
    }
    Write-Host "Client : n°$($client.id) - $($client.company_name) ($($client.firstname) $($client.lastname))"

    # 3. Demande d'origine (pour préremplir l'événement)
    $prospect = $null
    try {
        $prospect = Invoke-Api 'GET' '/prospects' $null $token |
            Where-Object { $_.email -ieq $ClientEmail } |
            Sort-Object { [int]$_.id } -Descending |
            Select-Object -First 1
    } catch { }

    $type = 'Séminaire'
    $lieu = 'À définir'
    $date = $null

    if ($prospect) {
        if ($prospect.event_type) { $type = $prospect.event_type }
        if ($prospect.location) { $lieu = $prospect.location }
        $date = ConvertTo-LocalDate $prospect.desired_date
    }
    if (-not $date) { $date = (Get-Date).AddMonths(2).ToString('yyyy-MM-dd') }

    $nomEvenement = "$type - $($client.company_name)"

    $totalHt = [decimal]0
    foreach ($ligne in $Lignes) { $totalHt += [decimal]$ligne.amount_ht }
    $tva = [math]::Round($totalHt * [decimal]0.2, 2)
    $totalTtc = $totalHt + $tva

    # 4. Récapitulatif et confirmation
    Write-Host ''
    Write-Host "Récapitulatif (rien n'est encore écrit) :" -ForegroundColor Yellow
    Write-Host "  Événement : $nomEvenement"
    Write-Host "              $date de 09:00 à 18:00 - $lieu - statut BROUILLON"
    foreach ($ligne in $Lignes) {
        Write-Host ('  - {0} : {1:F2} EUR HT' -f $ligne.label, [decimal]$ligne.amount_ht)
    }
    Write-Host ('  Total HT {0:F2} EUR | TVA 20 % {1:F2} EUR | Total TTC {2:F2} EUR' -f $totalHt, $tva, $totalTtc)
    Write-Host ''

    if (-not (Confirm-Action "Créer l'événement et le devis dans la base ?")) {
        Write-Host "Annulé : rien n'a été créé." -ForegroundColor Yellow
        return
    }

    # 5. Événement
    $evenement = Invoke-Api 'POST' '/admin/events' @{
        client_id = [int]$client.id
        name      = $nomEvenement
        start_at  = "$date 09:00:00"
        end_at    = "$date 18:00:00"
        location  = $lieu
        type      = $type
        theme     = $null
        status    = 'BROUILLON'
        is_public = $false
        image_url = $null
    } $token
    Write-Host "Événement créé : n°$($evenement.id)" -ForegroundColor Green

    # 6. Devis (le serveur calcule HT, TVA 20 % et TTC)
    $items = @()
    foreach ($ligne in $Lignes) { $items += @{ label = $ligne.label; amount_ht = [decimal]$ligne.amount_ht } }

    $devis = Invoke-Api 'POST' '/quotes' @{
        event_id  = [int]$evenement.id
        client_id = [int]$client.id
        items     = $items
    } $token
    Write-Host ('Devis créé : n°{0} - HT {1} / TVA {2} / TTC {3} EUR' -f $devis.id, $devis.total_ht, $devis.tva, $devis.total_ttc) -ForegroundColor Green

    # 7. PDF
    $pdf = Invoke-Api 'POST' "/quotes/$($devis.id)/pdf" $null $token
    $chemin = $pdf.path

    for ($i = 0; $i -lt 20; $i++) {
        if ((Test-Path $chemin) -and ((Get-Item $chemin).Length -gt 0)) { break }
        Start-Sleep -Milliseconds 250
    }

    if (Test-Path $chemin) {
        Write-Host "PDF généré : $chemin" -ForegroundColor Green
        if (-not $SansOuvrir) { Invoke-Item $chemin }
    } else {
        Write-Host "PDF demandé au serveur ($chemin), mais introuvable depuis cet ordinateur." -ForegroundColor Yellow
    }

    # 8. Envoi (simulé)
    $envoyer = $Envoyer.IsPresent
    if (-not $envoyer -and -not $Yes) {
        $envoyer = Confirm-Action "Marquer le devis comme envoyé à $($client.email) ? (l'e-mail est simulé)"
    }

    if ($envoyer) {
        Invoke-Api 'POST' "/quotes/$($devis.id)/send" @{ email = $client.email } $token | Out-Null
        Write-Host "Statut du devis : ETUDE_CLIENT (e-mail simulé par le backend, rien n'est réellement envoyé)." -ForegroundColor Green
    }

    Write-Host ''
    Write-Host 'Terminé.' -ForegroundColor Cyan
} catch {
    Write-Host ''
    Write-Host "ERREUR : $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
