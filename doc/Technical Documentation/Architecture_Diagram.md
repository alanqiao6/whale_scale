# WhaleScale Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["End User (Browser/App UI)"]
    end

    subgraph ProxyLayer["NGINX Reverse Proxy"]
        NGINX["NGINX (static frontend + API)"]
    end

    subgraph FrontendLayer["Frontend (React.js)"]
        ReactApp["Main React App"]
        
        subgraph Components["UI Components"]
            TopBar["TopBar.js"]
            Sidebar["Sidebar.js"]
            AuthModal["AuthModal.js"]
            ImageViewer["ImageViewer.js"]
            DataComponent["Data.js"]
            About["About.js"]
            HelpModal["HelpModal.js"]
        end
    end

    subgraph BackendLayer["Backend API (Python/Django)"]
        Django["Django Framework"]
        
        subgraph DjangoApps["Django Apps"]
            MainApp["Main App"]
            AccountsApp["Accounts App"]
        end
        
        subgraph CoreConfig["Core Configuration"]
            Settings["settings.py"]
            URLs["urls.py"]
            WSGI["wsgi.py"]
            ASGI["asgi.py"]
        end
    end

    subgraph CoreModules["Core Whale Modules"]
        subgraph MMI_CODEX["MMI_CODEX"]
            subgraph Collatrix["Collatrix"]
                BodyCondition["Body Condition"]
                LidarWrangle["Lidar Wrangle"]
                PyExifHelper["PyExif Helper"]
            end
            
            subgraph Morphometrix["Morphometrix"]
                BezierCurve["bezier_curve.py"]
                CalculateWidths["calculate_widths.py"]
                ComputeAngle["compute_angle_between_lines.py"]
                ComputeCurveLength["compute_curve_length.py"]
                ComputePolygonArea["compute_polygon_area.py"]
                MeasurementModule["measurement.py"]
            end
            
            subgraph Xcertainty["Xcertainty"]
                Formatters["Formatters"]
                Models["Models"]
                Parsers["Parsers"]
                Samplers["Samplers"]
                Util["Utility Functions"]
            end
        end
    end

    subgraph Database["Database"]
        SQLite["SQLite DB"]
    end

    Client --> ProxyLayer
    ProxyLayer --> FrontendLayer
    ProxyLayer --> BackendLayer
    FrontendLayer --> BackendLayer
    BackendLayer --> CoreModules
    BackendLayer --> Database
    
    %% Detailed connections within components
    ReactApp --> Components
    Django --> DjangoApps
    Django --> CoreConfig
    MainApp --> CoreModules
    
    %% Body condition module details
    BodyCondition --> BAI["calculate_body_area_index.py"]
    BodyCondition --> BAI_Parabola["calculate_body_area_index_parabola.py"]
    BodyCondition --> BAI_Trapezoid["calculate_body_area_index_trapezoid.py"]
    BodyCondition --> BV["calculate_body_volume.py"]
    BodyCondition --> BV_Circle["calculate_body_volume_circle.py"]
    BodyCondition --> BV_Ellipse["calculate_body_volume_ellipse.py"]
    
    %% Lidar wrangle module details
    LidarWrangle --> ExtractTime["extract_time_from_filename.py"]
    LidarWrangle --> GenerateVideoID["generate_video_id.py"]
    LidarWrangle --> WrangleLemhex["wrangle_lemhex_lidar.py"]
    LidarWrangle --> WrangleLightware["wrangle_lightware_lidar.py"]
    
    %% Xcertainty module details
    Formatters --> FormatAltimeter["format_altimeter_output.py"]
    Formatters --> FormatGrowthCurve["format_growth_curve_output.py"]
    Formatters --> FormatImage["format_image_output.py"]
    Formatters --> FormatObject["format_object_output.py"]
    Formatters --> FormatPixel["format_pixel_output.py"]
    
    Models --> TemplateModel["template_model.py"]
    
    Parsers --> CombineObservations["combine_observations.py"]
    Parsers --> ParseObservations["parse_observations.py"]
    
    Samplers --> CalibrationSampler["calibration_sampler.py"]
    Samplers --> GrowthCurveSampler["growth_curve_sampler.py"]
    Samplers --> IndependentLengthSampler["independent_length_sampler.py"]
    Samplers --> NondecreasingLengthSampler["nondecreasing_length_sampler.py"]
    
    Util --> BodyConditionUtil["body_condition.py"]
    Util --> BreakFunction["break_function.py"]
    Util --> DataValidation["data_validation.py"]
    Util --> ExtractSummaries["extract_summaries.py"]
    Util --> FlattenData["flatten_data.py"]